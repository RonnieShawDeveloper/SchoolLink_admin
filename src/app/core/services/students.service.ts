import { Injectable, signal } from '@angular/core';
import { StudentRecord, ParentContact, AttendanceToday, ClassCheckIn } from '../models/student-data';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

const SCHOOL_NAME = 'The Meridian School Elementary School';

@Injectable({ providedIn: 'root' })
export class StudentsService {
  private _students = signal<StudentRecord[]>(generateDummyStudents());

  list(): StudentRecord[] {
    return this._students();
  }

  getById(id: string): StudentRecord | undefined {
    return this._students().find(s => s.id === id);
  }
}

function generateDummyStudents(): StudentRecord[] {
  const base: Array<Pick<StudentRecord, 'StudentOpenEMIS_ID' | 'StudentName' | 'grade' | 'Address'>> = [
    { StudentOpenEMIS_ID: 'SL-2025-000001', StudentName: 'Ava Johnson', grade: '4', Address: '12 Blue Hill Rd' },
    { StudentOpenEMIS_ID: 'SL-2025-000002', StudentName: 'Ethan Smith', grade: '5', Address: '45 Bay Street' },
    { StudentOpenEMIS_ID: 'SL-2025-000003', StudentName: 'Mia Thompson', grade: '3', Address: '78 Nassau Ave' },
    { StudentOpenEMIS_ID: 'SL-2025-000004', StudentName: 'Noah Brown', grade: '2', Address: '22 Paradise Dr' },
    { StudentOpenEMIS_ID: 'SL-2025-000005', StudentName: 'Sophia Davis', grade: '1', Address: '5 Coral Harbour' },
    { StudentOpenEMIS_ID: 'SL-2025-000006', StudentName: 'Liam Wilson', grade: 'K', Address: '16 Cable Beach' },
  ];
  return base.map((b, i) => {
    const guardians = generateGuardians(b.StudentName);
    const attendanceToday = generateAttendanceToday();
    return {
      id: uuidv4(),
      // StudentData core fields
      StudentID: i + 1,
      InstitutionCode: 'MS-001',
      InstitutionName: SCHOOL_NAME,
      Ownewship: 'Bahamas Government',
      Type: 'Primary',
      Sector: 'Public',
      Provider: 'Ministry of Education',
      Locality: 'Urban',
      AreaEducationCode: 'AE-PRM',
      AreaEducation: 'New Providence',
      AreaAdministrativeCode: 'ADM-NP',
      AreaAdministrative: 'Nassau',
      EducationGrade: b.grade,
      AcademicPeriod: '2024-2025',
      StartDate: dayjs().startOf('month').toISOString(),
      EndDate: dayjs().add(9, 'month').toISOString(),
      ClassName: `Grade ${b.grade}`,
      LastGradeLevelEnrolled: b.grade,
      PreviousSchool: 'N/A',

      StudentOpenEMIS_ID: b.StudentOpenEMIS_ID,
      StudentName: b.StudentName,
      StudentStatus: 'Enrolled',
      Gender: Math.random() > 0.5 ? 'Male' : 'Female',
      DateOfBirth: dayjs().subtract(6 + Math.floor(Math.random() * 6), 'year').format('DD/MM/YYYY'),
      Age: 6 + Math.floor(Math.random() * 6),
      PreferredNationality: 'Bahamian',
      AllNationalities: 'Bahamian',
      DefaultIdentitytype: 'Birth Certificate',
      IdentityNumber: `ID-${100000 + i}`,
      RiskIndex: `${Math.floor(Math.random() * 100)}`,
      ExtraActivities: 'Basketball, Music',
      Address: b.Address,
      NIB2: `NIB-${200000 + i}`,

      MotherName: `Patricia ${lastNameOf(b.StudentName)}`,
      MotherOpenEMIS_ID: `M-${1000 + i}`,
      MotherContact: randomPhone(),
      MotherFirstName: 'Patricia',
      MotherLastName: lastNameOf(b.StudentName),
      MotherAddress: b.Address,
      MotherTelephone: randomPhone(),
      MotherEmail: emailFromName(`Patricia ${lastNameOf(b.StudentName)}`, 1),
      MotherDOB: dayjs().subtract(35 + Math.floor(Math.random() * 10), 'year').format('YYYY-MM-DD'),
      MotherIsDeceased: 'No',
      MotherNationality: 'Bahamian',

      FatherName: `Michael ${lastNameOf(b.StudentName)}`,
      FatherOpenEMIS_ID: `F-${1000 + i}`,
      FatherContact: randomPhone(),
      FatherFirstName: 'Michael',
      FatherLastName: lastNameOf(b.StudentName),
      FatherAddress: b.Address,
      FatherTelephone: randomPhone(),
      FatherEmail: emailFromName(`Michael ${lastNameOf(b.StudentName)}`, 1),
      FatherDOB: dayjs().subtract(38 + Math.floor(Math.random() * 12), 'year').format('YYYY-MM-DD'),
      FatherIsDeceased: 'No',
      FatherNationality: 'Bahamian',

      GuardianName: `Alicia ${lastNameOf(b.StudentName)}`,
      GuardianOpenEMIS_ID: `G-${1000 + i}`,
      GuardianGender: 'Female',
      GuardianDateOfBirth: dayjs().subtract(33 + Math.floor(Math.random() * 8), 'year').format('YYYY-MM-DD'),
      GuardianFirstName: 'Alicia',
      GuardianLastName: lastNameOf(b.StudentName),
      GuardianAddress: b.Address,
      GuardianTelephone: randomPhone(),
      GuardianEmail: emailFromName(`Alicia ${lastNameOf(b.StudentName)}`, 1),
      GuardianDOB: dayjs().subtract(33 + Math.floor(Math.random() * 8), 'year').format('YYYY-MM-DD'),
      GuardianIsDeceased: 'No',
      GuardianNationality: 'Bahamian',

      Studentlivingwith: 'Both Parents',
      StudentLivingWithGuardian: 'No',

      // runtime/UI helpers
      school: SCHOOL_NAME,
      grade: normalizeGrade(b.grade),
      guardians,
      attendanceToday,
      photoUrl: `/assets/placeholders/student_${(i % 6) + 1}.png`
    } satisfies StudentRecord;
  });
}

function lastNameOf(fullName?: string): string {
  return (fullName ?? '').trim().split(' ').slice(-1)[0] || 'Doe';
}

function generateGuardians(studentFullName?: string): ParentContact[] {
  const lastName = (studentFullName ?? '').trim().split(' ').slice(-1)[0] || 'Guardian';
  const names = [
    { name: `Patricia ${lastName}`, relation: 'Mother' as const },
    { name: `Michael ${lastName}`, relation: 'Father' as const },
    { name: `Alicia ${lastName}`, relation: 'Guardian' as const },
    { name: `David ${lastName}`, relation: 'Guardian' as const },
  ];
  // Pick 2 distinct guardians
  const g1 = names[Math.floor(Math.random() * names.length)];
  let g2 = names[Math.floor(Math.random() * names.length)];
  if (g2.name === g1.name) {
    g2 = names[(names.indexOf(g1) + 1) % names.length];
  }
  return [g1, g2].map((g, idx) => ({
    name: g.name,
    relation: g.relation,
    phone: randomPhone(),
    email: emailFromName(g.name, idx + 1)
  }));
}

function normalizeGrade(g: string): string {
  const trimmed = (g || '').toString().trim();
  if (/^k$/i.test(trimmed)) return 'K';
  const num = parseInt(trimmed, 10);
  if (!isNaN(num)) return String(num);
  return trimmed || 'K';
}

function randomPhone(): string {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `(242) 555-${suffix}`;
}

function emailFromName(name: string, n: number): string {
  const slug = name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
  return `${slug}${n}@example.com`;
}

function generateAttendanceToday(): AttendanceToday {
  const start = dayjs().hour(7).minute(30);
  const gateIn = start.add(10 + Math.floor(Math.random() * 45), 'minute'); // ~7:40 - 8:15

  const classNames = ['Homeroom', 'Math', 'Reading', 'Science'];
  const classCheckIns: ClassCheckIn[] = [];
  let t = gateIn.add(30, 'minute');
  for (let i = 0; i < classNames.length; i++) {
    classCheckIns.push({ className: classNames[i], time: t.toISOString() });
    t = t.add(60, 'minute');
  }

  // ~70% chance the student has checked out for the day
  const willCheckout = Math.random() < 0.7;
  let gateOutISO: string | undefined = undefined;
  let status: AttendanceToday['status'] = 'On Campus';
  if (willCheckout) {
    const out = dayjs().hour(15).minute(0).add(Math.floor(Math.random() * 60), 'minute'); // between 3:00 - 4:00
    gateOutISO = out.toISOString();
    status = 'Checked Out';
  }

  return {
    gateCheckIn: gateIn.toISOString(),
    classCheckIns,
    gateCheckOut: gateOutISO,
    status
  };
}
