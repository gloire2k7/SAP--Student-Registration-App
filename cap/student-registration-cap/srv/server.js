console.log("[server.js] file loaded");

const cds = require("@sap/cds");
const express = require("express");

cds.on("bootstrap", (app) => {
  console.log("[server.js] bootstrap — registering routes");

  // CORS
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Expose-Headers",
      "X-CSRF-Token, OData-Version",
    );
    if (req.method === "OPTIONS") {
      res.setHeader(
        "Access-Control-Allow-Headers",
        req.headers["access-control-request-headers"] || "*",
      );
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
      );
      res.setHeader("Access-Control-Max-Age", "86400");
      return res.status(204).end();
    }
    next();
  });

  // -------- Student profile picture upload --------
  console.log("[server.js] registering POST /uploadStudentPicture");

  app.post(
    "/uploadStudentPicture",
    express.raw({ type: "multipart/form-data", limit: "20mb" }),
    async (req, res) => {
      console.log("[server.js] /uploadStudentPicture hit");
      try {
        const db = await cds.connect.to("db");

        const contentType = req.headers["content-type"] || "";
        const boundaryMatch = contentType.match(/boundary=(.+)$/);
        if (!boundaryMatch) {
          return res.status(400).json({ error: "No multipart boundary" });
        }
        const parts = splitBuffer(
          req.body,
          Buffer.from("--" + boundaryMatch[1]),
        );

        let fileObj = null;
        let studentID = null;

        for (const part of parts) {
          if (part.length === 0) continue;
          const headerEnd = part.indexOf("\r\n\r\n");
          if (headerEnd === -1) continue;
          const headerText = part.slice(0, headerEnd).toString("utf8");
          const data = part.slice(headerEnd + 4, part.length - 2);

          const nameMatch = headerText.match(/name="([^"]+)"/);
          if (!nameMatch) continue;
          const fieldName = nameMatch[1];

          const filenameMatch = headerText.match(/filename="([^"]*)"/);
          const mimeMatch = headerText.match(/Content-Type:\s*([^\r\n]+)/i);

          if (filenameMatch) {
            fileObj = {
              filename: filenameMatch[1],
              mimetype: mimeMatch ? mimeMatch[1].trim() : "image/jpeg",
              data,
            };
          } else if (fieldName === "studentID") {
            studentID = data.toString("utf8");
          }
        }

        if (!fileObj) return res.status(400).json({ error: "No picture" });
        if (!studentID) return res.status(400).json({ error: "No studentID" });

        // Store as a data URL in the `picture` column
        const dataUrl =
          "data:" +
          fileObj.mimetype +
          ";base64," +
          fileObj.data.toString("base64");

        await db.run(
          UPDATE("student.registration.Students")
            .set({ picture: dataUrl })
            .where({ ID: studentID }),
        );

        console.log("[server.js] picture stored for student:", studentID);
        res.status(200).json({ ok: true });
      } catch (e) {
        console.error("[server.js] picture upload error:", e);
        res.status(500).json({ error: e.message });
      }
    },
  );
  // $batch body limit
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));
  app.use(express.text({ limit: "20mb", type: "text/*" }));
});

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

cds.on("served", async () => {
  try {
    await require("../db/data-init")();
  } catch (e) {
    console.error("[data-init] failed:", e.message);
  }
});

module.exports = cds.server;
