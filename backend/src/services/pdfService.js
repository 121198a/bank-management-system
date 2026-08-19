const PDFDocument = require('pdfkit');
const { decimalToString } = require('../utils/money');

const generateStatementPDF = (res, account, user, transactions, dateRange = {}) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=statement_${account.accountNumber}.pdf`);
  doc.pipe(res);

  doc.fillColor('#16a34a').fontSize(22).font('Helvetica-Bold').text('Bank Management System', { align: 'center' });
  doc.fillColor('#000000').fontSize(14).font('Helvetica').text('Account Statement', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(10).fillColor('#555555').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
  if (dateRange.from || dateRange.to) doc.text(`Period: ${dateRange.from || 'Beginning'} to ${dateRange.to || 'Present'}`, { align: 'center' });

  doc.moveDown(1.5).strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(1);
  doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold').text('Account Holder Details');
  doc.font('Helvetica').fontSize(10);
  doc.text(`Name: ${user.fullName}`);
  doc.text(`Email: ${user.email}`);
  doc.text(`Account Number: ${account.accountNumber}`);
  doc.text(`Account Type: ${account.accountType.toUpperCase()}`);
  doc.text(`Current Balance: ${account.currency} ${decimalToString(account.balance)}`);

  doc.moveDown(1.5).font('Helvetica-Bold').fontSize(11).text('Transaction History').moveDown(0.5);
  const tableTop = doc.y;
  const colWidths = { date: 90, type: 90, desc: 175, amount: 80, balance: 80 };
  let x = 50;
  doc.fontSize(9).font('Helvetica-Bold');
  for (const [label, key] of [['Date','date'],['Type','type'],['Description','desc'],['Amount','amount'],['Balance','balance']]) {
    doc.text(label, x, tableTop, { width: colWidths[key], align: ['amount','balance'].includes(key) ? 'right' : 'left' });
    x += colWidths[key];
  }
  doc.moveDown(0.5).strokeColor('#cccccc').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.3);
  doc.font('Helvetica').fontSize(9);

  if (transactions.length === 0) doc.text('No transactions found for this period.', 50, doc.y, { align: 'center' });
  transactions.forEach((tx) => {
    if (doc.y > 720) doc.addPage();
    const rowY = doc.y;
    x = 50;
    const sign = ['deposit', 'transfer_in'].includes(tx.type) ? '+' : '-';
    const typeLabel = tx.type.replace('_', ' ').toUpperCase();
    doc.text(new Date(tx.createdAt).toLocaleString(), x, rowY, { width: colWidths.date }); x += colWidths.date;
    doc.text(typeLabel, x, rowY, { width: colWidths.type }); x += colWidths.type;
    doc.text(tx.description || '-', x, rowY, { width: colWidths.desc }); x += colWidths.desc;
    doc.text(`${sign}${decimalToString(tx.amount)}`, x, rowY, { width: colWidths.amount, align: 'right' }); x += colWidths.amount;
    doc.text(decimalToString(tx.balanceAfter), x, rowY, { width: colWidths.balance, align: 'right' });
    doc.moveDown(0.7);
  });

  doc.moveDown(2).fontSize(8).fillColor('#999999').text('This is a system-generated statement and does not require a signature.', { align: 'center' });
  doc.end();
};

module.exports = { generateStatementPDF };
