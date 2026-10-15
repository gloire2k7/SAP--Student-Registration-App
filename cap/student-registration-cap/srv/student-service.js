const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
  const { Students, Registrations, Attachments } = this.entities;

  // ------------------------------------------------------------
  // Generate next application ID: P001, P002, ...
  // ------------------------------------------------------------
  async function nextAppId() {
    const rows = await SELECT.from(Registrations).columns("studentId");
    const nums = rows
      .map((r) => parseInt(String(r.studentId || "").replace(/^P/, ""), 10))
      .filter((n) => !isNaN(n));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return "P" + String(next).padStart(3, "0");
  }

  // ------------------------------------------------------------
  // Registration defaults
  // ------------------------------------------------------------
  this.before("CREATE", Registrations, async (req) => {
    if (!req.data.studentId) {
      req.data.studentId = await nextAppId();
    }
    if (!req.data.submittedOn) {
      req.data.submittedOn = new Date().toISOString().slice(0, 10);
    }
    if (!req.data.status) {
      req.data.status = "Pending";
    }
  });

  // ------------------------------------------------------------
  // UPLOAD PDF
  // Endpoint: POST /odata/uploadAttachment
  // Body: multipart/form-data with:
  //   - registrationID (text)
  //   - file (the PDF)
  // ------------------------------------------------------------
  this.on("uploadAttachment", async (req) => {
    const httpReq = req.http.req;

    let files;
    try {
      files = await parseMultipart(httpReq);
    } catch (e) {
      return req.error(400, "Could not parse upload: " + e.message);
    }

    const file = files.file;
    const registrationID = files.registrationID;

    if (!file) return req.error(400, "No file provided");
    if (!registrationID) return req.error(400, "No registrationID provided");

    const reg = await SELECT.one
      .from(Registrations)
      .where({ ID: registrationID });
    if (!reg) return req.error(404, "Registration not found");

    const attachment = {
      ID: cds.utils.uuid(),
      registration_ID: registrationID,
      fileName: file.filename || "document.pdf",
      mimeType: file.mimetype || "application/pdf",
      size: file.data.length,
      content: file.data,
    };
    await INSERT.into(Attachments).entries(attachment);

    return JSON.stringify({
      ID: attachment.ID,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      size: attachment.size,
    });
  });

  // ------------------------------------------------------------
  // Multipart/form-data parser (no external deps)
  // ------------------------------------------------------------
  async function parseMultipart(httpReq) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      httpReq.on("data", (c) => chunks.push(c));
      httpReq.on("end", () => {
        try {
          const body = Buffer.concat(chunks);
          const contentType = httpReq.headers["content-type"] || "";
          const boundaryMatch = contentType.match(/boundary=(.+)$/);
          if (!boundaryMatch) throw new Error("No multipart boundary");

          const boundary = "--" + boundaryMatch[1];
          const parts = splitBuffer(body, Buffer.from(boundary));

          const result = {};
          for (const part of parts) {
            if (part.length === 0) continue;
            const headerEnd = part.indexOf("\r\n\r\n");
            if (headerEnd === -1) continue;

            const headerText = part.slice(0, headerEnd).toString("utf8");
            const dataStart = headerEnd + 4;
            let dataEnd = part.length - 2; // strip trailing \r\n
            const data = part.slice(dataStart, dataEnd);

            const nameMatch = headerText.match(/name="([^"]+)"/);
            if (!nameMatch) continue;
            const fieldName = nameMatch[1];

            const filenameMatch = headerText.match(/filename="([^"]*)"/);
            const mimeMatch = headerText.match(/Content-Type:\s*([^\r\n]+)/i);

            if (filenameMatch) {
              result[fieldName] = {
                filename: filenameMatch[1],
                mimetype: mimeMatch
                  ? mimeMatch[1].trim()
                  : "application/octet-stream",
                data: data,
              };
            } else {
              result[fieldName] = data.toString("utf8");
            }
          }
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
      httpReq.on("error", reject);
    });
  }

  function splitBuffer(buf, sep) {
    const parts = [];
    let start = 0;
    let idx;
    while ((idx = buf.indexOf(sep, start)) !== -1) {
      parts.push(buf.slice(start, idx));
      start = idx + sep.length;
    }
    parts.push(buf.slice(start));
    return parts;
  }

  // ------------------------------------------------------------
  // Approve / Reject
  // ------------------------------------------------------------
  this.on("approveRegistration", async (req) => {
    const { registrationID } = req.data;
    const reg = await SELECT.one
      .from(Registrations)
      .where({ ID: registrationID });
    if (!reg) return req.error(404, "Registration not found");
    if (reg.status === "Approved") return req.error(400, "Already approved");

    const newStudent = {
      ID: cds.utils.uuid(),
      studentId: reg.studentId,
      firstName: reg.firstName,
      lastName: reg.lastName,
      email: reg.email,
      program: reg.program,
      year: reg.year,
      status: "Active",
      picture: reg.picture,
      registration_ID: reg.ID,
    };
    await INSERT.into(Students).entries(newStudent);
    await UPDATE(Registrations)
      .set({ status: "Approved" })
      .where({ ID: registrationID });

    return await SELECT.one.from(Students).where({ ID: newStudent.ID });
  });

  this.on("rejectRegistration", async (req) => {
    const { registrationID } = req.data;
    const reg = await SELECT.one
      .from(Registrations)
      .where({ ID: registrationID });
    if (!reg) return req.error(404, "Registration not found");

    await UPDATE(Registrations)
      .set({ status: "Rejected" })
      .where({ ID: registrationID });
    return "Rejected";
  });

  // ------------------------------------------------------------
  // Picture validation
  // ------------------------------------------------------------
  const MAX_PICTURE_LENGTH = 700000;
  const validatePicture = (req) => {
    const { picture } = req.data;
    if (!picture) return;
    if (typeof picture !== "string" || !picture.startsWith("data:image/")) {
      return req.error(400, "Picture must be an image data URI");
    }
    if (picture.length > MAX_PICTURE_LENGTH) {
      return req.error(400, "Picture exceeds 500 KB");
    }
  };
  this.before("CREATE", Students, validatePicture);
  this.before("CREATE", Registrations, validatePicture);
});
