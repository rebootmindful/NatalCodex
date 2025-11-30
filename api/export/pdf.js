const PDFDocument = require('pdfkit');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') { res.status(405).json({ success:false, message:'Method Not Allowed' }); return; }
    const b = req.body || {};
    const orderId = String(b.orderId||'');
    const content = String(b.content||'');
    const title = String(b.title||'Soul Codex Report');
    if (!orderId || !content) { res.status(400).json({ success:false, message:'orderId and content required' }); return; }

    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',`attachment; filename="${orderId}-report.pdf"`);
    const doc = new PDFDocument({ size:'A4', margin:50 });
    doc.pipe(res);
    doc.fontSize(20).text(title, { align:'center' });
    doc.moveDown();
    doc.fontSize(11).text(content, { align:'left' });
    doc.end();
  } catch (e) {
    res.status(500).json({ success:false, message:String(e&&e.message||'unknown') });
  }
};
