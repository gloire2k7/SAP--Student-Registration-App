const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
  const MAX_PICTURE_LENGTH = 700000; // ~500KB base64 encoded

  this.before("CREATE", "Students", (req) => {
    const { picture } = req.data;

    if (!picture) {
      return req.error(400, "Picture is required");
    }

    if (typeof picture !== "string" || !picture.startsWith("data:image/")) {
      return req.error(400, "Picture must be an image data URI");
    }

    if (picture.length > MAX_PICTURE_LENGTH) {
      return req.error(400, "Picture exceeds the maximum size of 500 KB");
    }
  });
  this.on("GET", "/sample-transcript.pdf", (req, res) => {
    const file = path.join(__dirname, "..", "app", "sample-transcript.pdf");
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="sample-transcript.pdf"',
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    });
    fs.createReadStream(file).pipe(res);
  });
});
