sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
  ],
  function (Controller, Filter, FilterOperator, Fragment, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("student.registration.controller.List", {
      onInit: function () {
        this._sSearchQuery = "";
        var oRouter = this.getOwnerComponent().getRouter();
        oRouter.getRoute("list").attachPatternMatched(this._onListMatched, this);
      },

      onAfterRendering: function () {
        var oBinding = this.byId("studentsTable").getBinding("items");
        if (!oBinding || this._countListenerAttached) {
          return;
        }

        oBinding.attachChange(
          function () {
            var iCount = oBinding.getLength();
            var oSnap = this.byId("countSnapped");
            var oExp = this.byId("countExpanded");
            if (oSnap) oSnap.setText(iCount + " students");
            if (oExp) oExp.setText(iCount + " students enrolled");
          }.bind(this),
        );

        this._countListenerAttached = true;
      },

      onExit: function () {
        if (this._pDeleteDialog) {
          this._pDeleteDialog.then(function (oDialog) {
            oDialog.destroy();
          });
          this._pDeleteDialog = null;
        }
      },

      _onListMatched: function () {
        setTimeout(
          function () {
            var oLayoutModel = this.getOwnerComponent().getModel("layout");
            if (oLayoutModel) {
              oLayoutModel.setProperty("/layout", "OneColumn");
            }
          }.bind(this),
          0,
        );

        var oFilterIntent = this.getOwnerComponent().getModel("filterIntent");
        if (!oFilterIntent) {
          return;
        }
        var sProgram = oFilterIntent.getProperty("/program");
        if (!sProgram) {
          return;
        }
        this.byId("programFilter").setSelectedKeys([sProgram]);
        this._applyFilters();
        oFilterIntent.setData({});
      },

      // ---------------- FILTERS ----------------
      onSearch: function (oEvent) {
        this._sSearchQuery = oEvent.getParameter("newValue") || "";
        this._applyFilters();
      },

      onFilterChange: function () {
        this._applyFilters();
      },

      onClearFilters: function () {
        this.byId("programFilter").setSelectedKeys([]);
        this.byId("statusFilter").setSelectedKeys([]);
        this.byId("yearFilter").setSelectedKey("");
        this._sSearchQuery = "";
        this._applyFilters();
      },

      _applyFilters: function () {
        var oBinding = this.byId("studentsTable").getBinding("items");
        var aFilters = [];

        if (this._sSearchQuery) {
          aFilters.push(
            new Filter({
              filters: [
                new Filter("firstName", FilterOperator.Contains, this._sSearchQuery),
                new Filter("lastName", FilterOperator.Contains, this._sSearchQuery),
                new Filter("email", FilterOperator.Contains, this._sSearchQuery),
              ],
              and: false,
            }),
          );
        }

        var aPrograms = this.byId("programFilter").getSelectedKeys();
        if (aPrograms.length) {
          aFilters.push(
            new Filter({
              filters: aPrograms.map(function (p) {
                return new Filter("program", FilterOperator.EQ, p);
              }),
              and: false,
            }),
          );
        }

        var sYear = this.byId("yearFilter").getSelectedKey();
        if (sYear) {
          aFilters.push(
            new Filter("year", FilterOperator.EQ, parseInt(sYear, 10)),
          );
        }

        var aStatuses = this.byId("statusFilter").getSelectedKeys();
        if (aStatuses.length) {
          aFilters.push(
            new Filter({
              filters: aStatuses.map(function (s) {
                return new Filter("status", FilterOperator.EQ, s);
              }),
              and: false,
            }),
          );
        }

        oBinding.filter(aFilters);
      },

      // ---------------- ROW PRESS -> OBJECT PAGE ----------------
      onRowPress: function (oEvent) {
        var oItem = oEvent.getSource();
        // DEFAULT model — no "students" name
        var oContext = oItem.getBindingContext();

        if (!oContext) {
          console.error("[List] No binding context found.", oItem);
          MessageBox.error("Could not read the selected student.");
          return;
        }

        // The CDS key is "ID" (uppercase)
        var sStudentId = oContext.getProperty("ID");
        console.log("[List] Selected student ID:", sStudentId, oContext.getObject());

        if (!sStudentId) {
          MessageBox.error("The selected student has no ID.");
          return;
        }

        this.getOwnerComponent().getRouter().navTo("object", {
          id: String(sStudentId),
        });
      },

      // ---------------- DELETE ----------------
      onDeleteStudent: function (oEvent) {
        var oCtx = oEvent.getSource().getBindingContext();
        if (!oCtx) return;

        var oStudent = oCtx.getObject();
        this._deletingContext = oCtx;

        if (!this._pDeleteDialog) {
          this._pDeleteDialog = Fragment.load({
            id: this.getView().getId(),
            name: "student.registration.fragment.DeleteConfirmDialog",
            controller: this,
          }).then(
            function (oDialog) {
              this.getView().addDependent(oDialog);
              return oDialog;
            }.bind(this),
          );
        }

        this._pDeleteDialog.then(
          function (oDialog) {
            var oMsg = sap.ui
              .getCore()
              .byId(
                this.getView().getId() +
                  "--deleteConfirmDialog--deleteMessage",
              );
            if (oMsg) {
              oMsg.setText(
                "Are you sure you want to delete the student " +
                  oStudent.firstName +
                  " " +
                  oStudent.lastName +
                  "?",
              );
            }
            oDialog.open();
          }.bind(this),
        );
      },

      onConfirmDelete: function () {
        if (!this._deletingContext) return;

        var oCtx = this._deletingContext;
        var oStudent = oCtx.getObject();

        // Default model, and .delete() on the context
        oCtx
          .delete()
          .then(
            function () {
              MessageToast.show(
                oStudent.firstName + " " + oStudent.lastName + " deleted",
              );
              this._pDeleteDialog.then(function (oDialog) {
                oDialog.close();
              });
              this._deletingContext = null;
            }.bind(this),
          )
          .catch(function (err) {
            MessageBox.error("Delete failed: " + (err.message || err));
          });
      },

      onCancelDelete: function () {
        this._pDeleteDialog.then(function (oDialog) {
          oDialog.close();
        });
        this._deletingContext = null;
      },

      // ---------------- NAVIGATION ----------------
      onRegisterStudent: function () {
        this.getOwnerComponent().getRouter().navTo("wizard");
      },

      onGoToWorklist: function () {
        this.getOwnerComponent().getRouter().navTo("worklist");
      },

      onGoToOverview: function () {
        this.getOwnerComponent().getRouter().navTo("overview");
      },

      onGoToSmart: function () {
        this.getOwnerComponent().getRouter().navTo("smart");
      },

      onNavBack: function () {
        var sPrev = sap.ui.core.routing.History.getInstance().getPreviousHash();
        if (sPrev !== undefined) window.history.go(-1);
        else this.getOwnerComponent().getRouter().navTo("list", {}, true);
      },

      // ---------------- THEME ----------------
      onThemeChange: function (oEvent) {
        var sKey = oEvent.getParameter("selectedItem").getKey();
        this._applyTheme(sKey);
      },

      _applyTheme: function (sKey) {
        sap.ui.getCore().applyTheme(sKey);
        localStorage.setItem("studentApp.theme", sKey);

        var oThemeModel = this.getOwnerComponent().getModel("theme");
        if (oThemeModel) {
          oThemeModel.setProperty("/current", sKey);
        }
      },
    });
  },
);