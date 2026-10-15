sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/core/routing/History"
], function (Controller, JSONModel, History) {
  "use strict";

  return Controller.extend("student.registration.controller.Overview", {

    onInit: function () {
      // Small model just for the dashboard counts
      var oDash = new JSONModel({
        totalStudents: 0,
        pendingCount: 0
      });
      this.getView().setModel(oDash, "dash");
    },

    onAfterRendering: function () {
      this._refreshCounts();
    },

    _refreshCounts: function () {
      var oModel = this.getView().getModel("students");
      if (!oModel) { return; }

      // V4: requestContexts returns a Promise with the contexts.
      // 0, 9999 = start index, length (get up to 9999 records)
      Promise.all([
        oModel.bindList("/Students").requestContexts(0, 9999),
        oModel.bindList("/PendingRegistrations").requestContexts(0, 9999)
      ]).then(function (aResults) {
        var iStudents = aResults[0].length;
        var iPending  = aResults[1].length;

        this.getView().getModel("dash").setData({
          totalStudents: iStudents,
          pendingCount: iPending
        });
      }.bind(this)).catch(function (err) {
        console.error("Dashboard counts failed:", err);
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

    onGoToList:     function () { this.getOwnerComponent().getRouter().navTo("list"); },
    onGoToWorklist: function () { this.getOwnerComponent().getRouter().navTo("worklist"); },
    onGoToWizard:   function () { this.getOwnerComponent().getRouter().navTo("wizard"); },

    onProgramPress: function (oEvent) {
      var oCtx = oEvent.getSource().getBindingContext("students");
      if (!oCtx) { return; }

      var sProgram = oCtx.getProperty("text");   // because the Programs list binds to {students>text}
      var oFilterIntent = this.getOwnerComponent().getModel("filterIntent");
      if (!oFilterIntent) {
        oFilterIntent = new sap.ui.model.json.JSONModel();
        this.getOwnerComponent().setModel(oFilterIntent, "filterIntent");
      }
      oFilterIntent.setData({ program: sProgram });
      this.getOwnerComponent().getRouter().navTo("list");
    }
  });
});