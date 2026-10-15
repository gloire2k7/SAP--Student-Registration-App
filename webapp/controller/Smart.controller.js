sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/routing/History"
], function (Controller, History) {
  "use strict";

  return Controller.extend("student.registration.controller.Smart", {

    onNavBack: function () {
      var sPrev = History.getInstance().getPreviousHash();
      if (sPrev !== undefined) {
        window.history.go(-1);
      } else {
        this.getOwnerComponent().getRouter().navTo("list", {}, true);
      }
    },

    onInfoPress: function () {
      sap.m.MessageBox.information(
        "SmartTable auto-generates columns, filters, and sorting from the OData metadata. " +
        "Use the Settings gear to choose which columns are visible, and the Save As button " +
        "on the filter bar to persist a variant."
      );
    }
  });
});