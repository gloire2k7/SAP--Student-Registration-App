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

    // CAP backend origin — where /sample-transcript.pdf is served from.
    // In Fiori Launchpad / deployed scenarios, replace this with the
    // destination or the actual CAP host.
    var CAP_ORIGIN = "http://localhost:4004";

    return Controller.extend("student.registration.controller.Worklist", {
      onInit: function () {
        var oLayoutModel = new JSONModel({ layout: "OneColumn" });
        this.getView().setModel(oLayoutModel, "layout");

        this._oPdfModel = new JSONModel({
          source: "",
          loading: false,
          error: false,
          errorMessage: "",
        });
      },

      onAfterRendering: function () {
        if (this._countListenerAttached) {
          return;
        }

        var oBinding = this.byId("pendingList").getBinding("items");
        if (!oBinding) {
          return;
        }

        oBinding.attachChange(
          function () {
            var iCount = oBinding.getLength();
            var oSnap = this.byId("pendingCountSnapped");
            var oExp = this.byId("pendingCountExpanded");
            if (oSnap) {
              oSnap.setText(iCount + " pending");
            }
            if (oExp) {
              oExp.setText(iCount + " pending registrations");
            }
          }.bind(this),
        );

        this._countListenerAttached = true;
      },

      onPendingSelect: function (oEvent) {
        var oItem = oEvent.getParameter("listItem");
        var oCtx = oItem.getBindingContext("students");

        this.byId("detailPage").setBindingContext(oCtx, "students");
        this.getView()
          .getModel("layout")
          .setProperty("/layout", "TwoColumnsMidExpanded");
      },

      onCloseDetail: function () {
        this.getView().getModel("layout").setProperty("/layout", "OneColumn");
        this.byId("pendingList").removeSelections(true);
      },

      onNavBack: function () {
        var sPrev = History.getInstance().getPreviousHash();
        if (sPrev !== undefined) {
          window.history.go(-1);
        } else {
          this.getOwnerComponent().getRouter().navTo("list", {}, true);
        }
      },

      onRefresh: function () {
        MessageToast.show("Refreshed (no backend yet)");
      },

      onApprove: function () {
        var oCtx = this.byId("detailPage").getBindingContext("students");
        var sName =
          oCtx.getProperty("firstName") + " " + oCtx.getProperty("lastName");

        MessageBox.confirm("Approve registration for " + sName + "?", {
          onClose: (sAction) => {
            if (sAction !== MessageBox.Action.OK) {
              return;
            }
            this._removePending(oCtx, sName + " approved");
          },
        });
      },

      onReject: function () {
        var oCtx = this.byId("detailPage").getBindingContext("students");
        var sName =
          oCtx.getProperty("firstName") + " " + oCtx.getProperty("lastName");

        MessageBox.confirm("Reject registration for " + sName + "?", {
          onClose: (sAction) => {
            if (sAction !== MessageBox.Action.OK) {
              return;
            }
            this._removePending(oCtx, sName + " rejected");
          },
        });
      },

      _removePending: function (oCtx, sToast) {
        var oModel = this.getView().getModel("students");

        oModel
          .delete(oCtx)
          .then(
            function () {
              this.onCloseDetail();
              MessageToast.show(sToast);
            }.bind(this),
          )
          .catch(function (err) {
            MessageBox.error("Action failed: " + (err.message || err));
          });
      },

      // -------------------------------------------------------------
      // PDF Preview
      // -------------------------------------------------------------
      onPreviewDocument: function () {
        var oCtx = this.byId("detailPage").getBindingContext("students");
        if (!oCtx) {
          return;
        }

        var sUrl = oCtx.getProperty("documentUrl");
        if (!sUrl) {
          MessageBox.warning("This registration has no document attached.");
          return;
        }

        // Build the absolute URL (hits CAP, not the UI5 dev server)
        var sAbsolute =
          sUrl.indexOf("http://") === 0 || sUrl.indexOf("https://") === 0
            ? sUrl
            : CAP_ORIGIN + (sUrl.charAt(0) === "/" ? sUrl : "/" + sUrl);

        // Reset state
        this._oPdfModel.setData({
          source: "",
          loading: true,
          error: false,
          errorMessage: "",
        });

        // Open the dialog
        this._getPdfDialog().then(function (oDialog) {
          oDialog.open();
        });

        // Pre-flight so we can show a real error (404, CORS, not-a-PDF)
        fetch(sAbsolute, { method: "GET" })
          .then(function (res) {
            if (!res.ok) {
              throw new Error(
                "Failed to load document (HTTP " +
                  res.status +
                  " " +
                  res.statusText +
                  ")",
              );
            }
            var sCt = (res.headers.get("content-type") || "").toLowerCase();
            if (
              sCt.indexOf("pdf") === -1 &&
              sCt.indexOf("octet-stream") === -1
            ) {
              throw new Error(
                "The URL did not return a PDF (content-type: " + sCt + ").",
              );
            }
            return res.blob();
          })
          .then(
            function (oBlob) {
              this._revokeBlobUrl();
              // Blob URL keeps iframe same-origin → no CORS surprises
              var sBlobUrl = URL.createObjectURL(oBlob);
              this._sBlobUrl = sBlobUrl;
              this._oPdfModel.setData({
                source: sBlobUrl,
                loading: false,
                error: false,
                errorMessage: "",
              });
            }.bind(this),
          )
          .catch(
            function (err) {
              this._oPdfModel.setData({
                source: "",
                loading: false,
                error: true,
                errorMessage:
                  err && err.message
                    ? err.message
                    : "The document could not be loaded.",
              });
            }.bind(this),
          );
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

      onOpenPdfInNewTab: function () {
        var sSrc = this._oPdfModel.getProperty("/source");
        if (sSrc) {
          window.open(sSrc, "_blank");
        }
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
        this._revokeBlobUrl();
      },

      _revokeBlobUrl: function () {
        if (this._sBlobUrl) {
          URL.revokeObjectURL(this._sBlobUrl);
          this._sBlobUrl = null;
        }
      },
      formatHasDocument: function (sUrl) {
        return !!(sUrl && sUrl.length > 0);
      },
    });
  },
);
