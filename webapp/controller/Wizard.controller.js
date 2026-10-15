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
          pictureDataUrl: "",
          puictureFileName: "",
          docId: false,
          docTranscripts: false,
          docPhoto: false,
          step1Valid: false,
          step2Valid: false,
          step3Valid: false,
        });
        this.getView().setModel(oModel, "wizard");
      },

      onPictureChange: function (oEvent) {
        var oFile =
          oEvent.getParameter("files") && oEvent.getParameter("files")[0];
        if (!oFile) {
          return;
        }

        var MAX_SIZE = 500 * 1024; // 500 KB
        if (oFile.size > MAX_SIZE) {
          sap.m.MessageBox.error(
            "The selected file is " +
              Math.round(oFile.size / 1024) +
              " KB. Please choose an image smaller than 500 KB.",
          );
          oEvent.getSource().clear();
          var oWizModel = this.getView().getModel("wizard");
          oWizModel.setProperty("/pictureDataUrl", "");
          oWizModel.setProperty("/pictureFileName", "");
          this.validateStep1();
          return;
        }

        var oReader = new FileReader();
        oReader.onload = function (e) {
          var oWizModel = this.getView().getModel("wizard");
          oWizModel.setProperty("/pictureDataUrl", e.target.result);
          oWizModel.setProperty("/pictureFileName", oFile.name);
          this.validateStep1();
        }.bind(this);

        oReader.onerror = function () {
          sap.m.MessageBox.error("Could not read the selected file.");
        };

        oReader.readAsDataURL(oFile);
      },

      onPictureSizeExceed: function (oEvent) {
        sap.m.MessageBox.error(
          "File exceeds the maximum size of 500 KB. Please choose a smaller image.",
        );
        oEvent.getSource().clear();
      },

      onPictureSizeExceed: function (oEvent) {
        sap.m.MessageBox.error(
          "File exceeds the maximum size. Please choose a smaller image.",
        );
        oEvent.getSource().clear();
      },

      validateStep1: function () {
        var oModel = this.getView().getModel("wizard");
        var m = oModel.getData();

        var bEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email || "");
        var bName =
          (m.firstName || "").trim().length > 0 &&
          (m.lastName || "").trim().length > 0;
        var bPicture = !!m.pictureDataUrl;

        oModel.setProperty("/step1Valid", bName && bEmail && bPicture);
      },
      validateStep2: function () {
        var sProgram = this.byId("program").getSelectedKey();
        var sYear = this.byId("startYear").getSelectedKey();
        this.getView()
          .getModel("wizard")
          .setProperty("/step2Valid", !!sProgram && !!sYear);
      },

      onStep2Complete: function () {
        MessageToast.show(
          "Program selected: " +
            this.getView().getModel("wizard").getProperty("/program"),
        );
      },

      validateStep3: function () {
        var m = this.getView().getModel("wizard").getData();
        var bOk = m.docId && m.docTranscripts && m.docPhoto;
        this.getView().getModel("wizard").setProperty("/step3Valid", bOk);
      },

      onStep3Complete: function () {
        MessageToast.show("Documents verified");
      },

      onWizardComplete: function () {
        var m = this.getView().getModel("wizard").getData();

        MessageBox.confirm(
          "Submit registration for " + m.firstName + " " + m.lastName + "?",
          {
            title: "Confirm Submission",
            onClose: (sAction) => {
              if (sAction !== MessageBox.Action.OK) {
                return;
              }
              this._submitRegistration(m);
            },
          },
        );
      },

      _submitRegistration: function (m) {
        var oModel = this.getView().getModel("students");
        var oListBinding = oModel.bindList("/Students");

        var sNewId = "S" + String(Date.now()).slice(-6);

        oListBinding.create({
          id: sNewId,
          firstName: m.firstName,
          lastName: m.lastName,
          email: m.email,
          program: m.program,
          year: parseInt(m.year, 10),
          gpa: 0,
          status: "Active",
          enrolledCourses: [],
          picture: m.pictureDataUrl,
        });

        oModel
          .submitBatch("$auto")
          .then(
            function () {
              MessageToast.show(
                "Student " + sNewId + " registered successfully",
              );
              this.getOwnerComponent().getRouter().navTo("list");
            }.bind(this),
          )
          .catch(function (err) {
            MessageBox.error("Registration failed: " + (err.message || err));
          });
      },

      onCancel: function () {
        MessageBox.confirm("Discard this registration?", {
          onClose: (sAction) => {
            if (sAction === MessageBox.Action.OK) {
              this.onNavBack();
            }
          },
        });
      },

      onNavBack: function () {
        var sPrev = History.getInstance().getPreviousHash();
        if (sPrev !== undefined) {
          window.history.go(-1);
        } else {
          this.getOwnerComponent().getRouter().navTo("list", {}, true);
        }
      },
    });
  },
);
