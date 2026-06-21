const PDFDocument = require('pdfkit');

/**
 * Streams a PDF account statement directly to the HTTP response.
 * @param {Object} res - Express response object
 * @param {Object} account - Account document
 * @param {Object} user - User document (owner)
 * @param {Array} transactions - Array of transaction documents
 * @param {Object} dateRange - { from, to } strings (optional)
 */
const generateStatementPDF = (res, account, user, transactions, dateRange = {}) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=statement_${account.accountNumber}.pdf`
  );

  doc.pipe(res);

  // Header
  doc
    .fillColor('#16a34a')
    .fontSize(22)
    .font('Helvetica-Bold')
    .text('Bank Management System', { align: 'center' });

  doc
    .fillColor('#000000')
    .fontSize(14)
    .font('Helvetica')
    .text('Account Statement', { align: 'center' });

  doc.moveDown(1);
  doc.fontSize(10).fillColor('#555555');
  doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
  if (dateRange.from || dateRange.to) {
    doc.text(
      `Period: ${dateRange.from || 'Beginning'} to ${dateRange.to || 'Present'}`,
      { align: 'center' }
    );
  }

  doc.moveDown(1.5);
  doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);

  // Account info
  doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold').text('Account Holder Details');
  doc.font('Helvetica').fontSize(10);
  doc.text(`Name: ${user.fullName}`);
  doc.text(`Email: ${user.email}`);
  doc.text(`Account Number: ${account.accountNumber}`);
  doc.text(`Account Type: ${account.accountType.toUpperCase()}`);
  doc.text(`Current Balance: ${account.currency} ${account.balance.toFixed(2)}`);

  doc.moveDown(1.5);
  doc.font('Helvetica-Bold').fontSize(11).text('Transaction History');
  doc.moveDown(0.5);

  // Table header
  const tableTop = doc.y;
  const colWidths = { date: 90, type: 90, desc: 175, amount: 80, balance: 80 };
  let x = 50;

  doc.fontSize(9).font('Helvetica-Bold');
  doc.text('Date', x, tableTop, { width: colWidths.date });
  x += colWidths.date;
  doc.text('Type', x, tableTop, { width: colWidths.type });
  x += colWidths.type;
  doc.text('Description', x, tableTop, { width: colWidths.desc });
  x += colWidths.desc;
  doc.text('Amount', x, tableTop, { width: colWidths.amount, align: 'right' });
  x += colWidths.amount;
  doc.text('Balance', x, tableTop, { width: colWidths.balance, align: 'right' });

  doc.moveDown(0.5);
  doc.strokeColor('#cccccc').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.3);

  doc.font('Helvetica').fontSize(9);

  if (transactions.length === 0) {
    doc.text('No transactions found for this period.', 50, doc.y, { align: 'center' });
  }

  transactions.forEach((tx) => {
    if (doc.y > 720) {
      doc.addPage();
    }
    const rowY = doc.y;
    x = 50;

    const sign = ['deposit', 'transfer_in'].includes(tx.type) ? '+' : '-';
    const typeLabel = tx.type.replace('_', ' ').toUpperCase();

    doc.text(new Date(tx.createdAt).toLocaleString(), x, rowY, { width: colWidths.date });
    x += colWidths.date;
    doc.text(typeLabel, x, rowY, { width: colWidths.type });
    x += colWidths.type;
    doc.text(tx.description || '-', x, rowY, { width: colWidths.desc });
    x += colWidths.desc;
    doc.text(`${sign}${tx.amount.toFixed(2)}`, x, rowY, {
      width: colWidths.amount,
      align: 'right'
    });
    x += colWidths.amount;
    doc.text(tx.balanceAfter.toFixed(2), x, rowY, {
      width: colWidths.balance,
      align: 'right'
    });

    doc.moveDown(0.7);
  });

  doc.moveDown(2);
  doc.fontSize(8).fillColor('#999999').text(
    'This is a system-generated statement and does not require a signature.',
    { align: 'center' }
  );

  doc.end();
};

module.exports = { generateStatementPDF };
