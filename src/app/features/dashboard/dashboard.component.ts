import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StudentsService } from '../../core/services/students.service';
import { StudentRecord } from '../../core/models/student-data';
import { StudentApiService, SchoolOption, SelectedSchoolData } from '../../core/services/student-api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="route-enter" style="display:flex; flex-direction:column; gap:16px;">
      <!-- Header Row -->
      <div style="display:flex; align-items:center; gap:12px; flex-wrap: wrap;">
        <h2 style="margin:0;">Dashboard</h2>
        <span class="chip" title="Current local time">{{ now | date: 'EEE, MMM d, y • h:mm a' }}</span>

        <!-- School Selection -->
        <div style="display:flex; align-items:center; gap:8px; margin-left: auto;">
          <label for="school-selector" style="font-size: 0.9rem; font-weight: 600; color: var(--bah-text-muted);">School:</label>
          <select
            id="school-selector"
            (change)="onSchoolSelected($event)"
            style="padding: 6px 12px; border: 1px solid var(--bah-border); border-radius: 6px; background: white; min-width: 250px;">
            <option value="">Select School</option>
            <option
              *ngFor="let school of schoolsList()"
              [value]="school.InstitutionCode"
              [selected]="selectedSchool()?.InstitutionCode === school.InstitutionCode">
              {{ school.InstitutionCode }} - {{ school.InstitutionName }}
            </option>
          </select>
          <div *ngIf="loadingSchools()" style="font-size: 0.8rem; color: var(--bah-text-muted);">Loading...</div>
        </div>

        <a routerLink="/admin" class="btn-primary">Admin</a>
      </div>

      <!-- Selected School Display -->
      <div *ngIf="selectedSchool()" style="background: #E8F7FB; border: 1px solid #B3E5FC; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="font-size: 0.85rem; color: var(--bah-text-muted);">Showing data for:</div>
          <div style="font-weight: 700; color: #0B4F6C;">{{ selectedSchool()?.InstitutionName }}</div>
          <div style="font-size: 0.85rem; color: var(--bah-text-muted);">({{ selectedSchool()?.InstitutionCode }})</div>
        </div>
      </div>

      <!-- KPI Cards -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px;">
        <div class="app-card" style="padding:16px;">
          <div style="font-size:0.9rem; color: var(--bah-text-muted);">Students Enrolled</div>
          <div style="font-size:1.8rem; font-weight:700;">{{ totalStudents }}</div>
        </div>
        <div class="app-card" style="padding:16px;">
          <div style="font-size:0.9rem; color: var(--bah-text-muted);">On Campus Now</div>
          <div style="font-size:1.8rem; font-weight:700;">{{ onCampus }}</div>
        </div>
        <div class="app-card" style="padding:16px;">
          <div style="font-size:0.9rem; color: var(--bah-text-muted);">Checked Out Today</div>
          <div style="font-size:1.8rem; font-weight:700;">{{ checkedOut }}</div>
        </div>
        <div class="app-card" style="padding:16px;">
          <div style="font-size:0.9rem; color: var(--bah-text-muted);">Late Arrivals</div>
          <div style="font-size:1.8rem; font-weight:700;">{{ lateArrivals }}</div>
        </div>
      </div>

      <!-- Main Grid: Recent Activity + Insights -->
      <div style="display:grid; grid-template-columns: 2fr 1fr; gap:16px; align-items:start;">
        <!-- Recent Activity -->
        <div class="app-card" style="padding:16px;">
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <h3 style="margin:0;">Recent Activity</h3>
            <a routerLink="/students" style="font-size:0.85rem;">View Students →</a>
          </div>
          <div *ngIf="recentActivity.length; else noActivity" style="margin-top:8px;">
            <div *ngFor="let e of recentActivity" style="display:flex; gap:12px; padding:10px 0; border-top:1px solid var(--bah-border); align-items:center;">
              <span class="chip" [ngStyle]="{ background: e.kind==='in' ? '#E7F8F0' : e.kind==='out' ? '#FDECEC' : '#E8F7FB', color: e.kind==='in' ? '#116149' : e.kind==='out' ? '#8A1C1C' : '#055' }">{{ e.label }}</span>
              <div style="flex:1; min-width:0;">
                <div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ e.student }}</div>
                <div style="font-size:0.85rem; color: var(--bah-text-muted);">{{ e.time | date: 'short' }}</div>
              </div>
            </div>
          </div>
          <ng-template #noActivity>
            <div style="margin-top:8px; color: var(--bah-text-muted);">No activity recorded for today.</div>
          </ng-template>
        </div>

        <!-- Right Column: Insights -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          <!-- Attendance by Grade -->
          <div class="app-card" style="padding:16px;">
            <h3 style="margin:0 0 8px 0;">Attendance by Grade</h3>
            <div *ngFor="let g of gradeBreakdown" style="padding:8px 0; border-top:1px solid var(--bah-border);">
              <div style="display:flex; justify-content:space-between; font-size:0.95rem;">
                <div>Grade {{ g.grade }}</div>
                <div style="color: var(--bah-text-muted);">{{ g.present }}/{{ g.total }}</div>
              </div>
              <div style="height:8px; background:#EEF6F9; border-radius:999px; overflow:hidden; margin-top:6px;">
                <div [ngStyle]="{ width: g.percent + '%', background: 'var(--bah-primary)' }" style="height:8px;"></div>
              </div>
            </div>
          </div>

          <!-- Hourly Activity Heatmap -->
          <div class="app-card" style="padding:16px;">
            <h3 style="margin:0 0 8px 0;">Activity by Hour</h3>
            <div style="display:grid; grid-template-columns: repeat(11, 1fr); gap:6px; align-items:end;">
              <div *ngFor="let h of hours; let i = index" title="{{ h }}:00" style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <div [ngStyle]="{ background: 'rgba(0,163,199,' + alphaFor(hourCounts[i]) + ')', height: (10 + (hourCounts[i]||0) * 6) + 'px', width: '100%', borderRadius: '6px', border: '1px solid var(--bah-border)' }"></div>
                <div style="font-size:0.7rem; color: var(--bah-text-muted);">{{ h }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private readonly svc = inject(StudentsService);
  private readonly api = inject(StudentApiService);

  students: StudentRecord[] = this.svc.list();
  now: Date = new Date();

  // School selection properties
  schoolsList = signal<SchoolOption[]>([]);
  selectedSchool = signal<SelectedSchoolData | null>(null);
  loadingSchools = signal<boolean>(false);

  ngOnInit() {
    this.loadSchoolsList();
    this.subscribeToSelectedSchool();
  }

  private loadSchoolsList() {
    this.loadingSchools.set(true);
    this.api.getSchoolsList().subscribe({
      next: (response) => {
        this.schoolsList.set(response.schools);
        this.loadingSchools.set(false);
      },
      error: (error) => {
        console.error('Failed to load schools list:', error);
        this.schoolsList.set([]);
        this.loadingSchools.set(false);
      }
    });
  }

  private subscribeToSelectedSchool() {
    this.api.selectedSchool$.subscribe(school => {
      this.selectedSchool.set(school);
    });
  }

  onSchoolSelected(event: Event) {
    const selectedCode = (event.target as HTMLSelectElement).value;
    if (!selectedCode) {
      this.api.setSelectedSchool(null);
      return;
    }

    const selectedSchool = this.schoolsList().find(school => school.InstitutionCode === selectedCode);
    if (selectedSchool) {
      const schoolData: SelectedSchoolData = {
        InstitutionCode: selectedSchool.InstitutionCode,
        InstitutionName: selectedSchool.InstitutionName
      };
      this.api.setSelectedSchool(schoolData);
    }
  }

  get totalStudents(): number { return this.students.length; }

  private lateThreshold: Date = this.todayAt(8, 10); // 8:10 AM

  get onCampus(): number { return this.students.filter(s => s.attendanceToday.status === 'On Campus').length; }
  get checkedOut(): number { return this.students.filter(s => !!s.attendanceToday.gateCheckOut).length; }
  get lateArrivals(): number { return this.students.filter(s => new Date(s.attendanceToday.gateCheckIn) > this.lateThreshold).length; }

  get recentActivity(): Array<{ label: string; time: Date; student: string; kind: 'in' | 'class' | 'out' }> {
    const events: Array<{ label: string; time: Date; student: string; kind: 'in' | 'class' | 'out' }> = [];
    for (const s of this.students) {
      events.push({ label: 'Gate In', time: new Date(s.attendanceToday.gateCheckIn), student: (s.StudentName || 'Unknown'), kind: 'in' });
      for (const c of s.attendanceToday.classCheckIns) {
        events.push({ label: `Class: ${c.className}`, time: new Date(c.time), student: (s.StudentName || 'Unknown'), kind: 'class' });
      }
      if (s.attendanceToday.gateCheckOut) {
        events.push({ label: 'Gate Out', time: new Date(s.attendanceToday.gateCheckOut), student: (s.StudentName || 'Unknown'), kind: 'out' });
      }
    }
    events.sort((a, b) => b.time.getTime() - a.time.getTime());
    return events.slice(0, 12);
  }

  get gradeBreakdown(): Array<{ grade: string; total: number; present: number; percent: number }> {
    const map = new Map<string, { total: number; present: number }>();
    for (const s of this.students) {
      const entry = map.get(s.grade) || { total: 0, present: 0 };
      entry.total += 1;
      if (s.attendanceToday.status === 'On Campus') entry.present += 1;
      map.set(s.grade, entry);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] === 'K' ? -1 : b[0] === 'K' ? 1 : parseInt(a[0]) - parseInt(b[0])))
      .map(([grade, { total, present }]) => ({ grade, total, present, percent: total ? Math.round((present / total) * 100) : 0 }));
  }

  get hours(): number[] { return Array.from({ length: 11 }, (_, i) => 7 + i); } // 7:00 - 17:00

  get hourCounts(): number[] {
    const counts = new Array(this.hours.length).fill(0);
    const add = (d: Date) => {
      const h = d.getHours();
      const idx = this.hours.indexOf(h);
      if (idx >= 0) counts[idx] += 1;
    };
    for (const s of this.students) {
      add(new Date(s.attendanceToday.gateCheckIn));
      for (const c of s.attendanceToday.classCheckIns) add(new Date(c.time));
      if (s.attendanceToday.gateCheckOut) add(new Date(s.attendanceToday.gateCheckOut));
    }
    return counts;
  }

  alphaFor(count: number): number {
    const max = Math.max(1, ...this.hourCounts);
    if (!count) return 0.08; // faint
    const a = 0.15 + (count / max) * 0.85;
    return Math.min(1, Math.max(0.08, parseFloat(a.toFixed(2))));
  }

  private todayAt(hour: number, minute = 0): Date {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d;
  }
}
