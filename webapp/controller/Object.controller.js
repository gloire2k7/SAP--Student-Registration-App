sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
  ],
  function (
    Controller,
    History,
    Fragment,
    JSONModel,
    MessageBox,
    MessageToast,
  ) {
    "use strict";

    return Controller.extend("student.registration.controller.Object", {
      // ---------------- INITIALIZATION ----------------
      onInit: function () {
        var oRouter = this.getOwnerComponent().getRouter();

        oRouter
          .getRoute("object")
          .attachPatternMatched(this._onObjectMatched, this);

        this._oEditModel = new JSONModel({});
        this._pDialog = null;
        this._oWorkingCopy = null;

        this._oPdfModel = new JSONModel({
          source: "",
          loading: false,
          error: false,
          errorMessage: "",
        });

        // Model for the Enrolled Courses list — the OData V4 List can't
        // bind to a Collection(Edm.String) directly, so we mirror it here.
        this.getView().setModel(new JSONModel({ items: [] }), "courses");
      },

      onExit: function () {
        if (this._pDialog) {
          this._pDialog.then(function (oDialog) {
            oDialog.destroy();
          });
          this._pDialog = null;
        }

        if (this._oEditModel) {
          this._oEditModel.destroy();
          this._oEditModel = null;
        }

        if (this._pPdfDialog) {
          this._pPdfDialog.then(function (oDialog) {
            oDialog.destroy();
          });
          this._pPdfDialog = null;
        }

        if (this._oPdfModel) {
          this._oPdfModel.destroy();
          this._oPdfModel = null;
        }
      },

      _onObjectMatched: function (oEvent) {
        var sId = oEvent.getParameter("arguments").id;
        console.log("[Object] Route matched. Student ID:", sId);

        this.getView().bindElement({
          path: "/Students('" + sId + "')",
          parameters: {
            $expand: "registration($expand=attachments)",
          },
        });

        var oView = this.getView();
        var oBinding = oView.getElementBinding();
        if (!oBinding) {
          console.error("[Object] No element binding found");
          return;
        }

        var self = this;

        function flipLayout() {
          var oLayoutModel = self.getOwnerComponent().getModel("layout");
          if (oLayoutModel) {
            oLayoutModel.setProperty("/layout", "TwoColumnsMidExpanded");
          }
        }

        function populateCourses() {
          var oCtx = oBinding.getBoundContext();
          if (!oCtx) return;
          var oData = oCtx.getObject() || {};
          var aCourses = Array.isArray(oData.enrolledCourses)
            ? oData.enrolledCourses
            : [];
          var aItems = aCourses.map(function (s) {
            return { name: String(s) };
          });
          self.getView().getModel("courses").setData({ items: aItems });
        }

        function onBindingChange() {
          var oCtx = oBinding.getBoundContext();
          if (oCtx && oCtx.getObject()) {
            flipLayout();
            populateCourses();
          } else {
            oBinding.attachEventOnce("change", onBindingChange);
          }
        }

        if (
          oBinding.getBoundContext() &&
          oBinding.getBoundContext().getObject()
        ) {
          flipLayout();
          populateCourses();
        } else {
          oBinding.attachEventOnce("change", onBindingChange);
        }
      },

      // ---------------- FORMATTERS ----------------
      formatPdfFrame: function (sUrl) {
  if (!sUrl) return "";
  var sSafe = String(sUrl).replace(/"/g, "&quot;");
  return (
    '<iframe src="' + sSafe + '" ' +
    'style="width:100%;height:100%;min-height:600px;border:0;display:block;background:#fff;" ' +
    'title="PDF Preview">' +
    '</iframe>'
  );
},

      // ---------------- DOCUMENTS SECTION ----------------
      onDocumentPreview: function (oEvent) {
        var oItem = oEvent.getSource();
        var oCtx = oItem.getBindingContext();
        if (!oCtx) return;

        var oAtt = oCtx.getObject();
        if (!oAtt || !oAtt.ID) return;

        var sUrl =
          "http://localhost:4004/odata/Attachments(" + oAtt.ID + ")/content";

        this._oPdfModel.setData({
          source: sUrl,
          loading: false,
          error: false,
          errorMessage: "",
        });

        this._getPdfDialog().then(function (oDialog) {
          oDialog.open();
        });
      },

      onDocumentDownload: function (oEvent) {
        var oItem = oEvent.getSource();
        var oCtx = oItem.getBindingContext();
        if (!oCtx) return;

        var oAtt = oCtx.getObject();
        if (!oAtt || !oAtt.ID) return;

        var sUrl =
          "http://localhost:4004/odata/Attachments(" + oAtt.ID + ")/content";

        var oLink = document.createElement("a");
        oLink.href = sUrl;
        oLink.download = oAtt.fileName || "document.pdf";
        oLink.target = "_blank";
        document.body.appendChild(oLink);
        oLink.click();
        document.body.removeChild(oLink);
      },

      _getPdfDialog: function () {
        if (!this._pPdfDialog) {
          this._pPdfDialog = Fragment.load({
            id: this.getView().getId(),
            name: "student.registration.fragment.PdfViewerDialog",
            controller: this,
          }).then(
            function (oDialog) {
              this.getView().addDependent(oDialog);
              oDialog.setModel(this._oPdfModel, "pdf");
              return oDialog;
            }.bind(this),
          );
        }
        return this._pPdfDialog;
      },

      onClosePdfDialog: function () {
        this._getPdfDialog().then(function (oDialog) {
          oDialog.close();
        });
      },

      onAfterClosePdfDialog: function () {
        this._oPdfModel.setData({
          source: "",
          loading: false,
          error: false,
          errorMessage: "",
        });
      },

      onOpenPdfInNewTab: function () {
        var sSrc = this._oPdfModel.getProperty("/source");
        if (sSrc) window.open(sSrc, "_blank");
      },

      // ---------------- FRAGMENT CONTROL LOOKUP ----------------
      _byFragmentId: function (sLocalId) {
        return Fragment.byId(this.getView().getId(), sLocalId);
      },

      // ---------------- EDIT ----------------
      onEditPress: function () {
        var oContext = this.getView().getBindingContext();
        if (!oContext) {
          MessageBox.error("No student is selected.");
          return;
        }

        var oStudent = oContext.getObject();
        var oWorkingCopy = JSON.parse(JSON.stringify(oStudent));

        oWorkingCopy.pictureFileName = oWorkingCopy.picture
          ? "Current picture"
          : "";

        this._oWorkingCopy = oWorkingCopy;

        if (!this._pDialog) {
          this._pDialog = Fragment.load({
            id: this.getView().getId(),
            name: "student.registration.fragment.EditStudentDialog",
            controller: this,
          }).then(
            function (oDialog) {
              this.getView().addDependent(oDialog);
              oDialog.setModel(this._oEditModel, "edit");
              return oDialog;
            }.bind(this),
          );
        }

        this._pDialog.then(
          function (oDialog) {
            this._oEditModel.setData(JSON.parse(JSON.stringify(oWorkingCopy)));
            this._clearAllValueStates();
            oDialog.open();
            this._validateForm();
          }.bind(this),
        );
      },

      onValidateField: function () {
        this._validateForm();
      },

      _validateForm: function () {
        var oFirst = this._byFragmentId("firstNameInput");
        var oLast = this._byFragmentId("lastNameInput");
        var oEmail = this._byFragmentId("emailInput");
        var oYear = this._byFragmentId("yearInput");
        var oGpa = this._byFragmentId("gpaInput");
        var oProgram = this._byFragmentId("programInput");
        var oSaveBtn = this._byFragmentId("saveBtn");
        var oStrip = this._byFragmentId("errorSummary");

        if (!oFirst || !oLast || !oEmail || !oYear || !oGpa || !oSaveBtn) {
          if (oSaveBtn) oSaveBtn.setEnabled(false);
          return false;
        }

        var bValid = true;
        var iErrors = 0;

        function validate(oInput, bFieldValid, sMessage) {
          if (!bFieldValid) {
            oInput.setValueState("Error");
            oInput.setValueStateText(sMessage);
            bValid = false;
            iErrors++;
          } else {
            oInput.setValueState("None");
            oInput.setValueStateText("");
          }
        }

        var sFirst = oFirst.getValue().trim();
        var sLast = oLast.getValue().trim();
        var sEmail = oEmail.getValue().trim();
        var sYear = oYear.getValue().trim();
        var sGpa = oGpa.getValue().trim();
        var sProgram = oProgram ? oProgram.getValue().trim() : "";

        validate(oFirst, sFirst.length > 0, "First name is required.");
        validate(oLast, sLast.length > 0, "Last name is required.");

        var bEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sEmail);
        validate(
          oEmail,
          sEmail.length > 0 && bEmailValid,
          sEmail.length === 0
            ? "Email is required."
            : "Enter a valid email address, e.g. name@uni.edu.",
        );

        var iYear = Number(sYear);
        validate(
          oYear,
          sYear !== "" && Number.isInteger(iYear) && iYear >= 1 && iYear <= 4,
          "Year must be a whole number from 1 to 4.",
        );

        var fGpa = Number(sGpa);
        validate(
          oGpa,
          sGpa !== "" && Number.isFinite(fGpa) && fGpa >= 0 && fGpa <= 4,
          "GPA must be between 0.0 and 4.0.",
        );

        var oData = this._oEditModel.getData() || {};
        oData.firstName = sFirst;
        oData.lastName = sLast;
        oData.email = sEmail;
        oData.year = sYear === "" ? "" : iYear;
        oData.gpa = sGpa === "" ? "" : fGpa;
        oData.program = sProgram;
        this._oEditModel.setData(oData);

        oSaveBtn.setEnabled(bValid);

        if (oStrip) {
          oStrip.setText(
            iErrors === 1
              ? "1 field needs attention."
              : iErrors + " fields need attention.",
          );
          oStrip.setVisible(iErrors > 0);
        }

        return bValid;
      },

      onSaveStudent: function () {
        if (!this._validateForm()) {
          MessageBox.error("Please fix the highlighted fields before saving.", {
            title: "Validation Errors",
          });
          return;
        }

        var oContext = this.getView().getBindingContext();
        if (!oContext) {
          MessageBox.error("Unable to find the selected student.");
          return;
        }

        var oEdited = this._oEditModel.getData();
        var sStudentID = oContext.getProperty("ID");

        oContext.setProperty("firstName", oEdited.firstName);
        oContext.setProperty("lastName", oEdited.lastName);
        oContext.setProperty("email", oEdited.email);
        oContext.setProperty("program", oEdited.program);
        oContext.setProperty("year", oEdited.year);
        oContext.setProperty("gpa", oEdited.gpa);

        var bNewPicture =
          oEdited.picture &&
          oEdited.picture !== oContext.getProperty("picture");

        this.getView()
          .getModel()
          .submitBatch("$auto")
          .then(
            function () {
              if (bNewPicture) {
                return this._uploadStudentPicture(sStudentID, oEdited.picture);
              }
            }.bind(this),
          )
          .then(
            function () {
              var oView = this.getView();
              var oBinding = oView.getElementBinding();
              if (oBinding) oBinding.refresh();

              this._clearAllValueStates();
              this._oWorkingCopy = null;
              this._pDialog.then(function (oDialog) {
                oDialog.close();
              });
              MessageToast.show("Student updated successfully");
            }.bind(this),
          )
          .catch(function (err) {
            MessageBox.error("Save failed: " + (err.message || err));
          });
      },

      _uploadStudentPicture: function (sStudentID, sDataUrl) {
        var aParts = sDataUrl.split(",");
        var sMime = (aParts[0].match(/:(.*?);/) || [null, "image/jpeg"])[1];
        var sB64 = aParts[1];
        var sBinary = atob(sB64);
        var aBytes = new Uint8Array(sBinary.length);
        for (var i = 0; i < sBinary.length; i++)
          aBytes[i] = sBinary.charCodeAt(i);
        var oBlob = new Blob([aBytes], { type: sMime });

        var sUrl = "http://localhost:4004/uploadStudentPicture";
        var oForm = new FormData();
        oForm.append("studentID", sStudentID);
        oForm.append("file", oBlob, "picture." + (sMime.split("/")[1] || "jpg"));

        return fetch(sUrl, { method: "POST", body: oForm }).then(function (res) {
          if (!res.ok) {
            return res.text().then(function (t) {
              throw new Error(
                "Picture upload failed (HTTP " + res.status + "): " + t,
              );
            });
          }
          return res.json();
        });
      },

      onCancelEdit: function () {
        if (!this._pDialog) return;

        this._pDialog.then(
          function (oDialog) {
            this._clearAllValueStates();
            this._oEditModel.setData({});
            this._oWorkingCopy = null;
            oDialog.close();
          }.bind(this),
        );
      },

      _clearAllValueStates: function () {
        [
          "firstNameInput",
          "lastNameInput",
          "emailInput",
          "programInput",
          "yearInput",
          "gpaInput",
        ].forEach(
          function (sLocalId) {
            var oControl = this._byFragmentId(sLocalId);
            if (oControl) {
              oControl.setValueState("None");
              oControl.setValueStateText("");
            }
          }.bind(this),
        );

        var oSaveBtn = this._byFragmentId("saveBtn");
        if (oSaveBtn) oSaveBtn.setEnabled(false);

        var oStrip = this._byFragmentId("errorSummary");
        if (oStrip) {
          oStrip.setText("");
          oStrip.setVisible(false);
        }
      },

      // ---------------- EMAIL ----------------
      onEmailPress: function () {
        var oContext = this.getView().getBindingContext();
        if (!oContext) return;

        var sEmail = oContext.getProperty("email");
        if (sEmail) {
          window.location.href = "mailto:" + sEmail;
        }
      },

      // ---------------- NAVIGATION ----------------
      onNavBack: function () {
        var sPrev = History.getInstance().getPreviousHash();
        if (sPrev !== undefined) {
          window.history.go(-1);
        } else {
          this.getOwnerComponent().getRouter().navTo("list", {}, true);
        }
      },

      onCloseColumn: function () {
        this.getOwnerComponent().getRouter().navTo("list", {}, true);
      },

      // ---------------- PICTURE UPLOAD IN EDIT DIALOG ----------------
      onEditPictureChange: function (oEvent) {
        var oFile =
          oEvent.getParameter("files") && oEvent.getParameter("files")[0];
        if (!oFile) return;

        var MAX_SIZE = 500 * 1024;
        if (oFile.size > MAX_SIZE) {
          MessageBox.error(
            "The selected file is " +
              Math.round(oFile.size / 1024) +
              " KB. Please choose an image smaller than 500 KB.",
          );
          oEvent.getSource().clear();
          this._oEditModel.setProperty("/picture", "");
          this._oEditModel.setProperty("/pictureFileName", "");
          return;
        }

        var oReader = new FileReader();
        oReader.onload = function (e) {
          this._oEditModel.setProperty("/picture", e.target.result);
          this._oEditModel.setProperty("/pictureFileName", oFile.name);
        }.bind(this);

        oReader.onerror = function () {
          MessageBox.error("Could not read the selected file.");
        };

        oReader.readAsDataURL(oFile);
      },

      onEditPictureSizeExceed: function (oEvent) {
        MessageBox.error(
          "File exceeds the maximum size of 500 KB. Please choose a smaller image.",
        );
        oEvent.getSource().clear();
      },
    });
  },
);