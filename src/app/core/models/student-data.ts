/**
 * @description
 * Represents the structure of a single student record from the 'StudentData' table.
 * This interface should be used in your Angular services and components to ensure
 * type safety when fetching or sending student data.
 */
export interface StudentData {
  // The primary key for the student record. It is not optional as every existing
  // record will have a unique ID.
  StudentID: number;

  // --- Institution Details ---
  InstitutionCode?: string;
  InstitutionName?: string;
  Ownewship?: string;
  Type?: string;
  Sector?: string;
  Provider?: string;
  Locality?: string;
  AreaEducationCode?: string;
  AreaEducation?: string;
  AreaAdministrativeCode?: string;
  AreaAdministrative?: string;

  // --- Academic Details ---
  EducationGrade?: string;
  AcademicPeriod?: string;
  // Dates are represented as strings, as this is how they are typically
  // serialized in JSON from a web API (e.g., "2024-08-23").
  StartDate?: string;
  EndDate?: string;
  ClassName?: string;
  LastGradeLevelEnrolled?: string;
  PreviousSchool?: string;

  // --- Student Personal Details ---
  StudentOpenEMIS_ID?: string;
  StudentName?: string;
  StudentStatus?: string;
  Gender?: string;
  DateOfBirth?: string;
  Age?: number;
  PreferredNationality?: string;
  AllNationalities?: string;
  DefaultIdentitytype?: string;
  IdentityNumber?: string;
  RiskIndex?: string;
  ExtraActivities?: string; // Mapped from TEXT type
  Address?: string;
  NIB2?: string;

  // --- Mother's Details ---
  MotherOpenEMIS_ID?: string;
  MotherName?: string;
  MotherContact?: string;
  MotherFirstName?: string;
  MotherLastName?: string;
  MotherAddress?: string;
  MotherTelephone?: string;
  MotherEmail?: string;
  MotherDOB?: string;
  MotherIsDeceased?: string;
  MotherNationality?: string;

  // --- Father's Details ---
  FatherOpenEMIS_ID?: string;
  FatherName?: string;
  FatherContact?: string;
  FatherFirstName?: string;
  FatherLastName?: string;
  FatherAddress?: string;
  FatherTelephone?: string;
  FatherEmail?: string;
  FatherDOB?: string;
  FatherIsDeceased?: string;
  FatherNationality?: string;

  // --- Guardian's Details ---
  GuardianOpenEMIS_ID?: string;
  GuardianName?: string;
  GuardianGender?: string;
  GuardianDateOfBirth?: string;
  GuardianFirstName?: string;
  GuardianLastName?: string;
  GuardianAddress?: string;
  GuardianTelephone?: string;
  GuardianEmail?: string;
  GuardianDOB?: string;
  GuardianIsDeceased?: string;
  GuardianNationality?: string;

  // --- Living Situation ---
  Studentlivingwith?: string;
  StudentLivingWithGuardian?: string;
}

// --- App compatibility & attendance helpers ---
export interface ParentContact {
  name: string;
  relation: 'Mother' | 'Father' | 'Guardian';
  phone: string;
  email: string;
}

export interface ClassCheckIn {
  className: string;
  time: string; // ISO string
}

export interface AttendanceToday {
  gateCheckIn: string; // ISO
  classCheckIns: ClassCheckIn[];
  gateCheckOut?: string; // ISO if checked out
  status: 'On Campus' | 'Checked Out';
}

// StudentRecord is the shape used by the app at runtime: it includes the new
// StudentData fields plus a few UI/runtime-only helpers (id, normalized grade
// code, attendance, optional photo, and a simplified guardians array derived
// from the parent/guardian fields above).
export interface StudentRecord extends StudentData {
  id: string; // UI routing identifier
  school: string; // mirrors InstitutionName for convenience
  grade: string; // normalized grade code (e.g., 'K', '1', '2', ...)
  guardians: ParentContact[];
  attendanceToday: AttendanceToday;
  photoUrl?: string;
}

