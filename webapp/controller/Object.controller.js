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
      //INITIALIZATION
      onInit: function () {
        var oRouter = this.getOwnerComponent().getRouter();

        oRouter
          .getRoute("object")
          .attachPatternMatched(this._onObjectMatched, this);

        this._oEditModel = new JSONModel({});
        this._pDialog = null;
        this._oWorkingCopy = null;
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
      },

      _onObjectMatched: function (oEvent) {
        var sId = oEvent.getParameter("arguments").id;
        console.log("[Object] Route matched. Student ID:", sId);

        // 1. Bind the element
        this.getView().bindElement({
          path: "/Students('" + sId + "')",
          model: "students",
        });

        // 2. Get the element binding and wait for data before flipping layout
        var oView = this.getView();
        var oBinding = oView.getElementBinding("students");

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

        // If the binding already has data (cached), flip immediately
        if (
          oBinding.getBoundContext() &&
          oBinding.getBoundContext().getObject()
        ) {
          flipLayout();
        } else {
          // Otherwise wait for the first data-bearing change
          oBinding.attachEventOnce("change", function () {
            var oCtx = oBinding.getBoundContext();
            if (oCtx && oCtx.getObject()) {
              flipLayout();
            } else {
              // Data not ready yet — wait for the next change
              oBinding.attachEventOnce("change", flipLayout);
            }
          });
        }
      },

      //FRAGMENT CONTROL LOOKUP
      _byFragmentId: function (sLocalId) {
        return Fragment.byId(this.getView().getId(), sLocalId);
      },

      onEditPress: function () {
        var oContext = this.getView().getBindingContext("students");

        if (!oContext) {
          MessageBox.error("No student is selected.");
          return;
        }

        var oStudent = oContext.getObject();
        var oWorkingCopy = JSON.parse(JSON.stringify(oStudent));

        // Give the picture a friendly label if one already exists
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

        // Fail closed: never allow Save if controls are unavailable.
        if (!oFirst || !oLast || !oEmail || !oYear || !oGpa || !oSaveBtn) {
          if (oSaveBtn) {
            oSaveBtn.setEnabled(false);
          }
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

        // Read current input values directly.
        var sFirst = oFirst.getValue().trim();
        var sLast = oLast.getValue().trim();
        var sEmail = oEmail.getValue().trim();
        var sYear = oYear.getValue().trim();
        var sGpa = oGpa.getValue().trim();
        var sProgram = oProgram ? oProgram.getValue().trim() : "";

        // First name
        validate(oFirst, sFirst.length > 0, "First name is required.");

        // Last name
        validate(oLast, sLast.length > 0, "Last name is required.");

        // Email
        var bEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sEmail);

        validate(
          oEmail,
          sEmail.length > 0 && bEmailValid,
          sEmail.length === 0
            ? "Email is required."
            : "Enter a valid email address, e.g. name@uni.edu.",
        );

        // Year: required integer between 1 and 4
        var iYear = Number(sYear);

        validate(
          oYear,
          sYear !== "" && Number.isInteger(iYear) && iYear >= 1 && iYear <= 4,
          "Year must be a whole number from 1 to 4.",
        );

        // GPA: required number between 0 and 4
        var fGpa = Number(sGpa);

        validate(
          oGpa,
          sGpa !== "" && Number.isFinite(fGpa) && fGpa >= 0 && fGpa <= 4,
          "GPA must be between 0.0 and 4.0.",
        );

        // Keep the edit model synchronized with the visible controls.
        // This ensures Save persists the values the user actually entered.
        var oData = this._oEditModel.getData() || {};

        oData.firstName = sFirst;
        oData.lastName = sLast;
        oData.email = sEmail;
        oData.year = sYear === "" ? "" : iYear;
        oData.gpa = sGpa === "" ? "" : fGpa;
        oData.program = sProgram;

        this._oEditModel.setData(oData);

        // Save is enabled only when every validated field is valid.
        oSaveBtn.setEnabled(bValid);

        // Show the error summary only when there are errors.
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

      //SAVE STUDENT
      onSaveStudent: function () {
        if (!this._validateForm()) {
          MessageBox.error("Please fix the highlighted fields before saving.", {
            title: "Validation Errors",
          });
          return;
        }

        var oContext = this.getView().getBindingContext("students");
        if (!oContext) {
          MessageBox.error("Unable to find the selected student.");
          return;
        }

        var oEdited = this._oEditModel.getData();

        // V4: setProperty on the context queues a PATCH.
        oContext.setProperty("firstName", oEdited.firstName);
        oContext.setProperty("lastName", oEdited.lastName);
        oContext.setProperty("email", oEdited.email);
        oContext.setProperty("program", oEdited.program);
        oContext.setProperty("year", oEdited.year);
        oContext.setProperty("gpa", oEdited.gpa);

        this.getView()
          .getModel("students")
          .submitBatch("$auto")
          .then(
            function () {
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
      // ---------- CANCEL EDIT ----------
      onCancelEdit: function () {
        if (!this._pDialog) {
          return;
        }

        this._pDialog.then(
          function (oDialog) {
            this._clearAllValueStates();

            // Discard unsaved changes.
            this._oEditModel.setData({});
            this._oWorkingCopy = null;

            oDialog.close();
          }.bind(this),
        );
      },

      // ---------- CLEAR VALIDATION STATES ----------
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
        if (oSaveBtn) {
          oSaveBtn.setEnabled(false);
        }

        var oStrip = this._byFragmentId("errorSummary");
        if (oStrip) {
          oStrip.setText("");
          oStrip.setVisible(false);
        }
      },

      // ---------- EMAIL ----------
      onEmailPress: function () {
        var oContext = this.getView().getBindingContext("students");

        if (!oContext) {
          return;
        }

        var sEmail = oContext.getProperty("email");

        if (sEmail) {
          window.location.href = "mailto:" + sEmail;
        }
      },

      onNavBack: function () {
        var oLayoutModel = this.getOwnerComponent().getModel("layout");
        if (oLayoutModel) {
          oLayoutModel.setProperty("/layout", "OneColumn");
        }

        var sPrev = History.getInstance().getPreviousHash();
        if (sPrev !== undefined) {
          window.history.go(-1);
        } else {
          this.getOwnerComponent().getRouter().navTo("list", {}, true);
        }
      },
      onCloseColumn: function () {
        var oLayoutModel = this.getOwnerComponent().getModel("layout");
        if (oLayoutModel) {
          oLayoutModel.setProperty("/layout", "OneColumn");
        }
        this.getOwnerComponent().getRouter().navTo("list", {}, true);
      },
      onEditPictureChange: function (oEvent) {
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
          sap.m.MessageBox.error("Could not read the selected file.");
        };

        oReader.readAsDataURL(oFile);
      },

      onEditPictureSizeExceed: function (oEvent) {
        sap.m.MessageBox.error(
          "File exceeds the maximum size of 500 KB. Please choose a smaller image.",
        );
        oEvent.getSource().clear();
      }
    });
  },
);
