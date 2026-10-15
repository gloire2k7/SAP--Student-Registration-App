const cds = require("@sap/cds");

module.exports = async function () {
  const db = await cds.connect.to("db");

  const programs = [
    { code: "Computer Science",        text: "Computer Science" },
    { code: "Biology",                 text: "Biology" },
    { code: "Mechanical Engineering",  text: "Mechanical Engineering" },
    { code: "Business Administration", text: "Business Administration" },
    { code: "Mathematics",             text: "Mathematics" },
    { code: "Physics",                 text: "Physics" },
  ];
  for (const p of programs) {
    const exists = await SELECT.one
      .from("student.registration.Programs")
      .where({ code: p.code });
    if (!exists) {
      await INSERT.into("student.registration.Programs").entries(p);
    }
  }

  const statuses = [
    { code: "Active",    text: "Active" },
    { code: "Inactive",  text: "Inactive" },
    { code: "Graduated", text: "Graduated" },
  ];
  for (const s of statuses) {
    const exists = await SELECT.one
      .from("student.registration.Statuses")
      .where({ code: s.code });
    if (!exists) {
      await INSERT.into("student.registration.Statuses").entries(s);
    }
  }

  console.log("[data-init] Programs & Statuses seeded");
};