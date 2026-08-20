const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const Document = require('../models/Document');
const ApiError = require('../utils/ApiError');

const STORAGE_ROOT = path.resolve(__dirname, '../../storage');
const MIME_EXTENSIONS = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const storageDirFor = (applicationType) => path.join(STORAGE_ROOT, applicationType.replace(/_/g, '-'));

const saveDocument = async ({ ownerId, applicationType, applicationId, documentType, mimeType, fileName, buffer }) => {
  if (!MIME_EXTENSIONS[mimeType]) throw new ApiError(415, 'Unsupported document type');
  if (!Document.schema.path('type').enumValues.includes(documentType)) throw new ApiError(400, 'Invalid document type');
  if (!fileName) throw new ApiError(400, 'File name is required');
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new ApiError(400, 'Document file is required');
  if (buffer.length > Document.MAX_FILE_SIZE_BYTES) {
    throw new ApiError(413, `Document exceeds the ${Document.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`);
  }

  const dir = storageDirFor(applicationType);
  const key = `${crypto.randomUUID()}${MIME_EXTENSIONS[mimeType]}`;
  const storagePath = path.join(dir, key);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(storagePath, buffer, { flag: 'wx' });

  try {
    return await Document.create({
      owner: ownerId,
      applicationType,
      application: applicationId,
      type: documentType,
      fileName: String(fileName).slice(0, 180),
      mimeType,
      size: buffer.length,
      storageReference: `${applicationType}/${key}`,
      status: 'uploaded'
    });
  } catch (error) {
    await fs.unlink(storagePath).catch(() => {});
    throw error;
  }
};

const readDocumentFile = async (document) => {
  const key = String(document.storageReference || '').split('/').pop();
  const dir = storageDirFor(document.applicationType);
  const storagePath = path.resolve(dir, path.basename(key || ''));
  if (!storagePath.startsWith(`${dir}${path.sep}`)) throw new ApiError(400, 'Invalid document reference');
  try {
    await fs.access(storagePath);
  } catch (_) {
    throw new ApiError(404, 'Document file is not available');
  }
  return fs.readFile(storagePath);
};

module.exports = { MIME_EXTENSIONS, saveDocument, readDocumentFile };
