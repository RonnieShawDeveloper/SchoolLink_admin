export interface ClassSchedulePeriod {
  period: number;
  name: string; // e.g., "Period 2"
  startISO: string;
  endISO: string;
}

export interface SchoolClass {
  id: string;
  code: string; // e.g., G4-MTH
  name: string; // e.g., Math - Grade 4
  subject: 'Homeroom' | 'Math' | 'Reading' | 'Science';
  gradeLevel: string; // e.g., 'K' | '1' | '2' | ...
  room: string; // e.g., Room 204
  teacher: string; // placeholder teacher name
  schedule: ClassSchedulePeriod[]; // periods when this class meets (typically one for elementary)
  roster: string[]; // student IDs
}
