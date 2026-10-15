sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("student.registration.Component", {
    metadata: { manifest: "json" },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);

      // Layout model (kept from earlier, even if FCL is disabled for now)
      this.setModel(new JSONModel({ layout: "OneColumn" }), "layout");

      // Theme model
      var sSavedTheme = localStorage.getItem("studentApp.theme") || "sap_horizon";
      this.setModel(new JSONModel({ current: sSavedTheme }), "theme");

      sap.ui.getCore().applyTheme(sSavedTheme);

      this.getRouter().initialize();

    }
  });
});