import { Injectable, inject } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { SchoolClass, ClassSchedulePeriod } from '../models/class';
import { StudentsService } from './students.service';
import { StudentRecord } from '../models/student-data';

export type Subject = 'Homeroom' | 'Math' | 'Reading' | 'Science';

export interface ClassAttendance {
  period: ClassSchedulePeriod;
  present: Array<{ student: StudentRecord; time: Date }>;
  late: Array<{ student: StudentRecord; time: Date; minutesLate: number }>;
  missing: StudentRecord[];
}

@Injectable({ providedIn: 'root' })
export class ClassesService {
  private readonly studentsSvc = inject(StudentsService);
  private classes: SchoolClass[] = [];
  private periodMap: Record<Subject, ClassSchedulePeriod> = this.createTodayPeriods();

  constructor() {
    this.seed();
  }

  list(): SchoolClass[] {
    return this.classes;
  }

  getById(id: string): SchoolClass | undefined {
    return this.classes.find(c => c.id === id);
  }

  enroll(studentId: string, classId: string): void {
    const cls = this.getById(classId);
    if (!cls) return;
    if (!cls.roster.includes(studentId)) cls.roster.push(studentId);
  }

  unenroll(studentId: string, classId: string): void {
    const cls = this.getById(classId);
    if (!cls) return;
    cls.roster = cls.roster.filter(id => id !== studentId);
  }

  attendanceForClass(cls: SchoolClass): ClassAttendance {
    const period = cls.schedule[0]; // one scheduled period per subject/class
    const students = this.studentsSvc.list().filter(s => cls.roster.includes(s.id));

    const present: Array<{ student: StudentRecord; time: Date }> = [];
    const late: Array<{ student: StudentRecord; time: Date; minutesLate: number }> = [];

    const start = new Date(period.startISO);
    const end = new Date(period.endISO);
    const lateThreshold = dayjs(start).add(5, 'minute');

    for (const s of students) {
      const check = s.attendanceToday.classCheckIns.find(ci => ci.className === cls.subject);
      if (check) {
        const t = new Date(check.time);
        if (t >= start && t <= end) {
          if (dayjs(t).isAfter(lateThreshold)) {
            late.push({ student: s, time: t, minutesLate: Math.max(1, dayjs(t).diff(start, 'minute')) });
          } else {
            present.push({ student: s, time: t });
          }
          continue;
        }
      }
    }

    const presentIds = new Set([...present.map(p => p.student.id), ...late.map(l => l.student.id)]);
    const missing = students.filter(s => !presentIds.has(s.id));

    // sort present/late by time
    present.sort((a, b) => a.time.getTime() - b.time.getTime());
    late.sort((a, b) => a.time.getTime() - b.time.getTime());

    return { period, present, late, missing };
  }

  periodsToday(): ClassSchedulePeriod[] {
    return Object.values(this.periodMap);
  }

  private seed() {
    const students = this.studentsSvc.list();
    const grades = Array.from(new Set(students.map(s => s.grade))).sort((a, b) => (a === 'K' ? -1 : b === 'K' ? 1 : parseInt(a) - parseInt(b)));
    const subjects: Subject[] = ['Homeroom', 'Math', 'Reading', 'Science'];

    for (const grade of grades) {
      const gradeStudents = students.filter(s => s.grade === grade);
      for (const subj of subjects) {
        const id = uuidv4();
        const code = `${grade === 'K' ? 'K' : 'G' + grade}-${abbr(subj)}`;
        const teacher = randomTeacher();
        const room = `Room ${200 + Math.floor(Math.random() * 20)}`;
        const period = this.periodMap[subj];
        const cls: SchoolClass = {
          id,
          code,
          name: `${subj} - Grade ${grade}`,
          subject: subj,
          gradeLevel: grade,
          room,
          teacher,
          schedule: [period],
          roster: gradeStudents.map(s => s.id)
        };
        this.classes.push(cls);
      }
    }
  }

  private createTodayPeriods(): Record<Subject, ClassSchedulePeriod> {
    const mk = (period: number, name: string, h1: number, m1: number, h2: number, m2: number): ClassSchedulePeriod => {
      const start = dayjs().hour(h1).minute(m1).second(0).millisecond(0);
      const end = dayjs().hour(h2).minute(m2).second(0).millisecond(0);
      return { period, name, startISO: start.toISOString(), endISO: end.toISOString() };
    };
    return {
      Homeroom: mk(1, 'Period 1', 8, 15, 8, 45),
      Math: mk(2, 'Period 2', 9, 0, 10, 0),
      Reading: mk(3, 'Period 3', 10, 10, 11, 10),
      Science: mk(4, 'Period 4', 11, 20, 12, 20),
    };
  }
}

function abbr(s: Subject): string {
  switch (s) {
    case 'Homeroom': return 'HRM';
    case 'Math': return 'MTH';
    case 'Reading': return 'RDG';
    case 'Science': return 'SCI';
  }
}

function randomTeacher(): string {
  const first = ['Emily', 'James', 'Olivia', 'Liam', 'Isabella', 'Noah', 'Sophia', 'Mason'];
  const last = ['Taylor', 'Anderson', 'Lee', 'Harris', 'Clark', 'Lewis', 'Walker', 'Young'];
  return `${first[Math.floor(Math.random()*first.length)]} ${last[Math.floor(Math.random()*last.length)]}`;
}
