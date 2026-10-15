namespace student.registration;

using { cuid, managed } from '@sap/cds/common';

entity Students : managed {
  key ID          : UUID;
      studentId   : String(10);
      firstName   : String(50)  not null;
      lastName    : String(50)  not null;
      email       : String(120) not null;
      program     : String(80);
      year        : Integer;
      gpa         : Decimal(2, 1);
      status      : String(20)  default 'Active';
      picture     : LargeString;

      enrolledCourses : array of String(10);
      registration    : Association to Registrations;
}

entity Registrations : managed {
  key ID                : UUID;
      studentId         : String(10) not null;
      firstName         : String(50) not null;
      lastName          : String(50) not null;
      email             : String(120) not null;
      program           : String(80);
      year              : Integer;
      dob               : Date;
      submittedOn       : Date;
      documentsComplete : Boolean default false;
      notes             : String(500);
      status            : String(20) default 'Pending';
      picture           : LargeString;

      attachments       : Composition of many Attachments
                            on attachments.registration = $self;
}

// Custom Attachments entity — stores PDF as a BLOB in the DB
entity Attachments : managed {
  key ID          : UUID;
      registration: Association to Registrations;
      fileName    : String(255);
      mimeType    : String(100) default 'application/pdf';
      size        : Integer;
      content     : LargeBinary @Core.MediaType: mimeType
                                @Core.ContentDisposition: { Type: 'inline' };
}

entity Programs {
  key code : String(80);
      text : String(80);
}

entity Statuses {
  key code : String(20);
      text : String(20);
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

annotate Registrations with {
  studentId   @title: 'Application ID';
  firstName   @title: 'First Name';
  lastName    @title: 'Last Name';
  submittedOn @title: 'Submitted On';
  status      @title: 'Status';
};