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

export interface Student {
  id: string;
  studentId: string;
  fullName: string;
  grade: string;
  address: string;
  school: string;
  guardians: ParentContact[];
  attendanceToday: AttendanceToday;
  photoUrl?: string;
}
