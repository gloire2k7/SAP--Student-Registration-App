sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History",
  ],
  function (Controller, JSONModel, MessageBox, MessageToast, History) {
    "use strict";

    return Controller.extend("student.registration.controller.Wizard", {
      onInit: function () {
        this._resetWizardModel();
      },

      _resetWizardModel: function () {
        var oModel = new JSONModel({
          firstName: "",
          lastName: "",
          email: "",
          dob: null,
          program: "",
          year: "",
          notes: "",
          pdfFileName: "",
          pdfFile: null,
          docId: false,
          docTranscripts: false,
          docPhoto: false,
          step1Valid: false,
          step2Valid: false,
          step3Valid: false,
        });
        this.getView().setModel(oModel, "wizard");
      },

      // -------- Step 1: personal info (no picture) --------
      validateStep1: function () {
        var m = this.getView().getModel("wizard").getData();
        var bEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email || "");
        var bName =
          (m.firstName || "").trim().length > 0 &&
          (m.lastName || "").trim().length > 0;

        this.getView()
          .getModel("wizard")
          .setProperty("/step1Valid", bName && bEmail);
      },

      // -------- Step 2: program / year --------
      validateStep2: function () {
        var sProgram = this.byId("program").getSelectedKey();
        var sYear = this.byId("startYear").getSelectedKey();
        this.getView()
          .getModel("wizard")
          .setProperty("/step2Valid", !!sProgram && !!sYear);
      },

      // -------- Step 3: documents + PDF --------
      onPdfChange: function (oEvent) {
        var oFile =
          oEvent.getParameter("files") && oEvent.getParameter("files")[0];
        if (!oFile) return;

        if (oFile.type !== "application/pdf") {
          MessageBox.error("Only PDF files are allowed.");
          oEvent.getSource().clear();
          this.getView().getModel("wizard").setProperty("/pdfFile", null);
          this.validateStep3();
          return;
        }

        var MAX_PDF = 10 * 1024 * 1024;
        if (oFile.size > MAX_PDF) {
          MessageBox.error("PDF exceeds 10 MB.");
          oEvent.getSource().clear();
          this.getView().getModel("wizard").setProperty("/pdfFile", null);
          this.validateStep3();
          return;
        }

        this.getView().getModel("wizard").setProperty("/pdfFile", oFile);
        this.getView().getModel("wizard").setProperty("/pdfFileName", oFile.name);
        this.validateStep3();
      },

      onPdfTypeMismatch: function () {
        MessageBox.error("Only PDF files are allowed.");
      },

      validateStep3: function () {
        var m = this.getView().getModel("wizard").getData();
        var bAllDocs = m.docId && m.docTranscripts && m.docPhoto;
        var bPdf = !!m.pdfFile;
        this.getView()
          .getModel("wizard")
          .setProperty("/step3Valid", bAllDocs && bPdf);
      },

      // -------- Final submit --------
      onWizardComplete: function () {
        var m = this.getView().getModel("wizard").getData();

        MessageBox.confirm(
          "Submit registration for " + m.firstName + " " + m.lastName + "?",
          {
            title: "Confirm Submission",
            onClose: (sAction) => {
              if (sAction !== MessageBox.Action.OK) return;
              this._submitRegistration(m);
            },
          },
        );
      },

      _submitRegistration: function (m) {
        var oModel = this.getView().getModel(); // OData V4
        var oListBinding = oModel.bindList("/Registrations");

        var oCtx = oListBinding.create({
          firstName: m.firstName,
          lastName: m.lastName,
          email: m.email,
          program: m.program,
          year: m.year ? parseInt(m.year, 10) : null,
          dob: m.dob,
          notes: m.notes,
          documentsComplete: true,
        });

        oCtx
          .created()
          .then(
            function () {
              var sRegID = oCtx.getProperty("ID");
              return this._uploadPdf(sRegID, m.pdfFile);
            }.bind(this),
          )
          .then(
            function () {
              MessageToast.show("Registration submitted for review.");
              this.getOwnerComponent().getRouter().navTo("worklist", {}, true);
            }.bind(this),
          )
          .catch(function (err) {
            MessageBox.error("Submission failed: " + (err.message || err));
          });
      },

      _uploadPdf: function (sRegID, oFile) {
        var sUrl = "http://localhost:4004/uploadAttachment";
        var oForm = new FormData();
        oForm.append("registrationID", sRegID);
        oForm.append("file", oFile, oFile.name);

        return fetch(sUrl, { method: "POST", body: oForm }).then(
          function (res) {
            if (!res.ok) {
              return res.text().then(function (t) {
                throw new Error(
                  "PDF upload failed (HTTP " + res.status + "): " + t,
                );
              });
            }
            return res.json();
          },
        );
      },

      onCancel: function () {
        MessageBox.confirm("Discard this registration?", {
          onClose: (sAction) => {
            if (sAction === MessageBox.Action.OK) this.onNavBack();
          },
        });
      },

      onNavBack: function () {
        var sPrev = History.getInstance().getPreviousHash();
        if (sPrev !== undefined) window.history.go(-1);
        else this.getOwnerComponent().getRouter().navTo("worklist", {}, true);
      },
    });
  },
);