using { student.registration as db } from '../db/schema';

@protocol: 'odata-v4'
service StudentService @(path: '/odata') {
  entity Students              as projection on db.Students;
  entity Programs              as projection on db.Programs;
  entity Statuses              as projection on db.Statuses;
  entity PendingRegistrations  as projection on db.PendingRegistrations;
}