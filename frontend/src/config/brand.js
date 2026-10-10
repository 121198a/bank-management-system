// Single source of truth for the product name (matching file: backend/src/config/brand.js).
// Provisional until the owner confirms D1-D4 in docs/upgrade/PHASE2_IDENTITY.md.
export const BRAND = {
  name: 'NexaBank',
  descriptor: 'Bank Management System'
};

// Default document title (no page heading available) and the per-page suffix.
export const DEFAULT_TITLE = `${BRAND.name} — ${BRAND.descriptor}`;
export const titleFor = (heading) => (heading ? `${heading} — ${BRAND.name}` : DEFAULT_TITLE);
