using { student.registration as my } from '../db/schema';

service StudentService @(path: '/odata') {

  entity Students      as projection on my.Students;
  entity Registrations as projection on my.Registrations;
  entity Programs      as projection on my.Programs;
  entity Statuses      as projection on my.Statuses;

  @readonly
  entity Attachments   as projection on my.Attachments;

  action approveRegistration(registrationID: UUID) returns Students;
  action rejectRegistration(registrationID: UUID) returns String;

}