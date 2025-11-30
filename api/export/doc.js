const { Document, Packer, Paragraph } = require('docx');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') { res.status(405).json({ success:false, message:'Method Not Allowed' }); return; }
    const b = req.body || {};
    const orderId = String(b.orderId||'');
    const content = String(b.content||'');
    const title = String(b.title||'Soul Codex Report');
    if (!orderId || !content) { res.status(400).json({ success:false, message:'orderId and content required' }); return; }

    const paragraphs = content.split(/\n+/).map(t => new Paragraph(t));
    const doc = new Document({ sections: [{ properties: {}, children: [ new Paragraph({ text: title }), ...paragraphs ] }] });
    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition',`attachment; filename="${orderId}-report.docx"`);
    res.end(buffer);
  } catch (e) {
    res.status(500).json({ success:false, message:String(e&&e.message||'unknown') });
  }
};
