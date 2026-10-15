const cds = require("@sap/cds");
const express = require("express");

cds.on("bootstrap", (app) => {
  // Increase JSON body limit BEFORE other middleware
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
    }

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS"
    );

    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] ||
        [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "X-CSRF-Token",
          "OData-Version",
          "DataServiceVersion",
          "MaxDataServiceVersion",
          "Accept",
          "Prefer"
        ].join(",")
    );

    res.setHeader(
      "Access-Control-Expose-Headers",
      "OData-Version, DataServiceVersion, MaxDataServiceVersion, X-CSRF-Token"
    );

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    next();
  });
});

module.exports = cds.server;