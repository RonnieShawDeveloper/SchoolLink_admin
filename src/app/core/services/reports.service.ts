import { Injectable, inject } from '@angular/core';
import dayjs from 'dayjs';
import { StudentsService } from './students.service';
import { ClassesService, Subject } from './classes.service';
import { StudentRecord } from '../models/student-data';
import { SchoolClass } from '../models/class';

export type DayMode = 'Daily' | 'Weekly' | 'Monthly';

export interface StudentDayStatus {
  student: StudentRecord;
  status: 'Present' | 'Absent' | 'Late';
  gateIn?: string; // ISO
  gateOut?: string; // ISO
  classCheckIns: Partial<Record<Subject, string>>; // ISO per subject if present
}

export interface ClassDaySummary {
  classRef: SchoolClass;
  present: StudentRecord[];
  late: Array<{ student: StudentRecord; minutesLate: number }>;
  missing: StudentRecord[];
}

export interface DayReport {
  dateISO: string; // start of day ISO
  totals: { present: number; absent: number; late: number };
  students: StudentDayStatus[];
  classes: ClassDaySummary[];
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly studentsSvc = inject(StudentsService);
  private readonly classesSvc = inject(ClassesService);

  private cache = new Map<string, DayReport>();

  getDayReport(date: Date): DayReport {
    const start = dayjs(date).startOf('day');
    const key = start.toISOString();
    const cached = this.cache.get(key);
    if (cached) return cached;

    const students = this.studentsSvc.list();
    const classes = this.classesSvc.list();

    // Build student statuses deterministically
    const statuses: StudentDayStatus[] = students.map((s) => this.generateStudentDayStatus(s, start));

    // Build class summaries based on statuses and rosters
    const classSummaries: ClassDaySummary[] = classes.map((cls) => this.summarizeClassForDay(cls, statuses));

    const totals = {
      present: statuses.filter((st) => st.status !== 'Absent').length,
      late: statuses.filter((st) => st.status === 'Late').length,
      absent: statuses.filter((st) => st.status === 'Absent').length,
    };

    const report: DayReport = {
      dateISO: key,
      totals,
      students: statuses,
      classes: classSummaries,
    };
    this.cache.set(key, report);
    return report;
  }

  getWeekDays(baseDate: Date): Date[] {
    const d = dayjs(baseDate).startOf('week'); // Sunday start; acceptable for mock
    return Array.from({ length: 7 }, (_, i) => d.add(i, 'day').toDate());
  }

  getMonthDays(baseDate: Date): Date[] {
    const start = dayjs(baseDate).startOf('month');
    const days = start.daysInMonth();
    return Array.from({ length: days }, (_, i) => start.add(i, 'day').toDate());
  }

  private summarizeClassForDay(cls: SchoolClass, statuses: StudentDayStatus[]): ClassDaySummary {
    const period = cls.schedule[0];
    const start = dayjs(period.startISO);
    const lateThreshold = start.add(5, 'minute');

    const rosterStatuses = statuses.filter((s) => cls.roster.includes(s.student.id));

    const present: StudentRecord[] = [];
    const late: Array<{ student: StudentRecord; minutesLate: number }> = [];

    for (const st of rosterStatuses) {
      const tISO = st.classCheckIns[cls.subject];
      if (tISO) {
        const t = dayjs(tISO);
        if (t.isAfter(lateThreshold)) {
          late.push({ student: st.student, minutesLate: Math.max(1, t.diff(start, 'minute')) });
        } else {
          present.push(st.student);
        }
      }
    }

    const presentIds = new Set([...present.map((p) => p.id), ...late.map((l) => l.student.id)]);
    const missing = rosterStatuses.filter((st) => !presentIds.has(st.student.id)).map((st) => st.student);

    return { classRef: cls, present, late, missing };
  }

  private generateStudentDayStatus(s: StudentRecord, day: dayjs.Dayjs): StudentDayStatus {
    const rng = (min: number, max: number) => min + (this.hashToFloat(s.id + day.format('YYYYMMDD')) * (max - min));
    const chance = this.hashToFloat('absent:' + s.id + ':' + day.format('YYYYMMDD'));
    const isAbsent = chance < 0.05; // 5% absent
    const isLate = !isAbsent && this.hashToFloat('late:' + s.id + ':' + day.format('YYYYMMDD')) < 0.15; // 15% late if present

    const classCheckIns: Partial<Record<Subject, string>> = {};

    if (isAbsent) {
      return { student: s, status: 'Absent', classCheckIns };
    }

    // Gate in between 7:35 - 8:50 depending on late
    const gateInBase = isLate ? day.hour(8).minute(20) : day.hour(7).minute(40);
    const gateIn = gateInBase.add(Math.floor(rng(0, 25)), 'minute');

    // Gate out between 3:00 - 4:00 pm
    const gateOut = day.hour(15).minute(0).add(Math.floor(rng(0, 60)), 'minute');

    // For each subject period, set check-in near start (0-10 minutes after start). If late overall, push later accordingly.
    const periods = this.classesSvc.periodsToday();
    for (const p of periods) {
      // Map period to Subject by matching start time to our period map; simpler: infer via name keywords
      // We will use ClassesService's subject keys order: Homeroom, Math, Reading, Science
      // Build a parallel array
    }

    // Direct mapping via ClassesService's internal order; re-derive subjects
    const subjects: Subject[] = ['Homeroom', 'Math', 'Reading', 'Science'];
    for (const subj of subjects) {
      const period = this.getPeriodFor(subj);
      const start = dayjs(period.startISO);
      let delta = Math.floor(rng(0, 8));
      if (isLate && subj === 'Homeroom') delta += Math.floor(rng(5, 20));
      const t = start.add(delta, 'minute');
      classCheckIns[subj] = t.toISOString();
    }

    return {
      student: s,
      status: isLate ? 'Late' : 'Present',
      gateIn: gateIn.toISOString(),
      gateOut: gateOut.toISOString(),
      classCheckIns,
    };
  }

  private getPeriodFor(subj: Subject) {
    // Expose via classesSvc.periodsToday order mapping
    const map = new Map<Subject, ReturnType<ClassesService['periodsToday']>[number]>();
    const periods = this.classesSvc.periodsToday();
    // periods come in [Homeroom, Math, Reading, Science] order from service implementation
    const subjects: Subject[] = ['Homeroom', 'Math', 'Reading', 'Science'];
    subjects.forEach((s, i) => map.set(s, periods[i]));
    return map.get(subj)!;
  }

  private hashToFloat(input: string): number {
    // Simple deterministic hash -> [0,1)
    let h = 2166136261 >>> 0; // FNV-1a base
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967296; // 2^32
  }
}
