sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History",
    "sap/ui/core/Fragment",
  ],
  function (
    Controller,
    JSONModel,
    MessageBox,
    MessageToast,
    History,
    Fragment,
  ) {
    "use strict";

    return Controller.extend("student.registration.controller.Worklist", {
      onInit: function () {
        this.getView().setModel(
          new JSONModel({ layout: "OneColumn" }),
          "layout",
        );
        this.getView().setModel(
          new JSONModel({ hasAttachments: false }),
          "detail",
        );

        this._oPdfModel = new JSONModel({
          source: "",
          loading: false,
          error: false,
          errorMessage: "",
        });
      },

      onNavBack: function () {
        var sPrev = History.getInstance().getPreviousHash();
        if (sPrev !== undefined) window.history.go(-1);
        else this.getOwnerComponent().getRouter().navTo("list", {}, true);
      },

      onRefresh: function () {
        this.byId("pendingList").getBinding("items").refresh();
        MessageToast.show("Refreshed");
      },

      onNewRegistration: function () {
        this.getOwnerComponent().getRouter().navTo("wizard");
      },

      onViewStudents: function () {
        this.getOwnerComponent().getRouter().navTo("list");
      },

      onPendingSelect: function (oEvent) {
        var oItem = oEvent.getParameter("listItem");
        var oCtx = oItem.getBindingContext();
        this.byId("detailPage").setBindingContext(oCtx);

        var oData = oCtx.getObject() || {};
        var aAttachments = Array.isArray(oData.attachments)
          ? oData.attachments
          : [];
        this.getView()
          .getModel("detail")
          .setProperty("/hasAttachments", aAttachments.length > 0);

        this.getView()
          .getModel("layout")
          .setProperty("/layout", "TwoColumnsMidExpanded");
      },

      onCloseDetail: function () {
        this.getView().getModel("layout").setProperty("/layout", "OneColumn");
        this.byId("pendingList").removeSelections(true);
      },

      onApprove: function () {
        var oCtx = this.byId("detailPage").getBindingContext();
        var sName =
          oCtx.getProperty("firstName") + " " + oCtx.getProperty("lastName");
        var sID = oCtx.getProperty("ID");

        MessageBox.confirm("Approve registration for " + sName + "?", {
          onClose: function (sAction) {
            if (sAction !== MessageBox.Action.OK) return;
            this._callAction("approveRegistration", sID, sName + " approved");
          }.bind(this),
        });
      },

      onReject: function () {
        var oCtx = this.byId("detailPage").getBindingContext();
        var sName =
          oCtx.getProperty("firstName") + " " + oCtx.getProperty("lastName");
        var sID = oCtx.getProperty("ID");

        MessageBox.confirm("Reject registration for " + sName + "?", {
          onClose: function (sAction) {
            if (sAction !== MessageBox.Action.OK) return;
            this._callAction("rejectRegistration", sID, sName + " rejected");
          }.bind(this),
        });
      },

      _callAction: function (sAction, sID, sToast) {
        var oModel = this.getView().getModel();
        var oOperation = oModel.bindContext("/" + sAction + "(...)");
        oOperation.setParameter("registrationID", sID);

        oOperation
          .execute()
          .then(
            function () {
              MessageToast.show(sToast);
              this.onCloseDetail();
              this.byId("pendingList").getBinding("items").refresh();
            }.bind(this),
          )
          .catch(function (err) {
            MessageBox.error("Action failed: " + (err.message || err));
          });
      },

      // ---------------- PDF Preview ----------------
      onPreviewDocument: function () {
        var oCtx = this.byId("detailPage").getBindingContext();
        if (!oCtx) return;

        var oData = oCtx.getObject() || {};
        var aAttachments = Array.isArray(oData.attachments)
          ? oData.attachments
          : [];

        if (!aAttachments.length) {
          MessageBox.warning("No document attached.");
          return;
        }

        this._previewAttachment({ ID: aAttachments[0].ID });
      },

      onPreviewAttachment: function (oEvent) {
        var oItem = oEvent.getSource();
        var oCtx = oItem.getBindingContext();
        if (!oCtx) return;
        var oAtt = oCtx.getObject();
        if (oAtt && oAtt.ID) {
          this._previewAttachment({ ID: oAtt.ID });
        }
      },

      _previewAttachment: function (oAtt) {
        var sUrl =
          "/odata/Attachments(" + oAtt.ID + ")/content";

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

      // Builds the iframe HTML for core:HTML's content property
      formatPdfFrame: function (sUrl) {
        if (!sUrl) return "";
        var sSafe = String(sUrl).replace(/"/g, "&quot;");
        return (
          '<iframe src="' +
          sSafe +
          '" ' +
          'style="width:100%;height:100%;min-height:600px;border:0;display:block;background:#fff;" ' +
          'title="PDF Preview">' +
          "</iframe>"
        );
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
    });
  },
);
