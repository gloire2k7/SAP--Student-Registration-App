namespace student.registration;

using { cuid, managed } from '@sap/cds/common';

entity Students : managed {
  key id          : String(10);
      firstName   : String(50)  not null;
      lastName    : String(50)  not null;
      email       : String(120) not null;
      program     : String(80);
      year        : Integer;
      gpa         : Decimal(2, 1);
      status      : String(20)  default 'Active';
      picture     : LargeString;        // <-- NEW

      enrolledCourses : array of String(10);
}

entity Programs {
  key code  : String(80);
      text  : String(80);
}

entity Statuses {
  key code  : String(20);
      text  : String(20);
}

entity PendingRegistrations : managed {
  key id                : String(10);
      firstName         : String(50) not null;
      lastName          : String(50) not null;
      email             : String(120);
      program           : String(80);
      year              : Integer;
      submittedOn       : Date;
      documentsComplete : Boolean default false;
      notes             : String(500);
      documentUrl       : String(500); 
}

annotate Students with {
  firstName @title: 'First Name';
  lastName  @title: 'Last Name';
  email     @title: 'Email';
  program   @title: 'Program';
  year      @title: 'Year';
  gpa       @title: 'GPA';
  status    @title: 'Status';
  picture   @title: 'Picture';
};