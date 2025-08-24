import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsService, DayReport } from '../../../core/services/reports.service';
import { StudentApiService, SelectedSchoolData } from '../../../core/services/student-api.service';

@Component({
  selector: 'app-reports-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="route-enter" style="display:flex; flex-direction:column; gap:16px;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <h2 style="margin:0;">Reports</h2>
        <div style="display:flex; gap:8px;">
          <button class="btn-primary" [ngStyle]="activeStyle('Daily')" (click)="setMode('Daily')">Daily</button>
          <button class="btn-primary" [ngStyle]="activeStyle('Weekly')" (click)="setMode('Weekly')">Weekly</button>
          <button class="btn-primary" [ngStyle]="activeStyle('Monthly')" (click)="setMode('Monthly')">Monthly</button>
        </div>
      </div>

      <!-- Daily Controls and View -->
      <ng-container *ngIf="mode() === 'Daily'; else nonDaily">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button class="btn-primary" (click)="prevDay()">◀ Prev</button>
          <button class="btn-primary" (click)="today()">Today</button>
          <button class="btn-primary" (click)="nextDay()">Next ▶</button>
          <span class="chip">{{ selectedDate | date: 'EEEE, MMM d, y' }}</span>
        </div>

        <!-- KPI cards -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px;">
          <div class="app-card" style="padding:16px;">
            <div style="font-size:0.9rem; color: var(--bah-text-muted);">Present</div>
            <div style="font-size:1.8rem; font-weight:700;">{{ report.totals.present }}</div>
          </div>
          <div class="app-card" style="padding:16px;">
            <div style="font-size:0.9rem; color: var(--bah-text-muted);">Late</div>
            <div style="font-size:1.8rem; font-weight:700;">{{ report.totals.late }}</div>
          </div>
          <div class="app-card" style="padding:16px;">
            <div style="font-size:0.9rem; color: var(--bah-text-muted);">Absent</div>
            <div style="font-size:1.8rem; font-weight:700;">{{ report.totals.absent }}</div>
          </div>
        </div>

        <!-- Details: By Class and By Student -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; align-items:start;">
          <div class="app-card" style="padding:16px;">
            <h3 style="margin:0 0 8px 0;">By Class</h3>
            <div *ngFor="let c of report.classes" style="padding:10px 0; border-top:1px solid var(--bah-border); display:flex; align-items:center; gap:12px;">
              <div style="flex:1; min-width:0;">
                <div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ c.classRef.name }} ({{ c.classRef.code }})</div>
                <div style="font-size:0.85rem; color: var(--bah-text-muted);">
                  {{ c.classRef.schedule[0].name }} · {{ c.classRef.schedule[0].startISO | date:'shortTime' }}–{{ c.classRef.schedule[0].endISO | date:'shortTime' }}
                </div>
              </div>
              <span class="chip" style="background:#E7F8F0; color:#116149;" title="Present">{{ c.present.length }}</span>
              <span class="chip" style="background:#FFF3F3; color:#8A1C1C;" title="Late">+{{ c.late.length }}</span>
              <span class="chip" style="background:#FDECEC; color:#8A1C1C;" title="Missing">{{ c.missing.length }}</span>
            </div>
          </div>
          <div class="app-card" style="padding:16px;">
            <h3 style="margin:0 0 8px 0;">By Student</h3>
            <div style="overflow:auto;">
              <table style="width:100%; border-collapse: collapse;">
                <thead>
                <tr style="text-align:left;">
                  <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Name</th>
                  <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Status</th>
                  <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Gate In</th>
                  <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Gate Out</th>
                </tr>
                </thead>
                <tbody>
                <tr *ngFor="let s of report.students" style="border-top:1px solid var(--bah-border)">
                  <td style="padding:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ s.student.StudentName }}</td>
                  <td style="padding:8px;">
                    <span class="chip" [ngStyle]="statusChipStyle(s.status)">{{ s.status }}</span>
                  </td>
                  <td style="padding:8px;">{{ s.gateIn ? (s.gateIn | date:'shortTime') : '—' }}</td>
                  <td style="padding:8px;">{{ s.gateOut ? (s.gateOut | date:'shortTime') : '—' }}</td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- Weekly / Monthly Views -->
      <ng-template #nonDaily>
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button class="btn-primary" (click)="prevPeriod()">◀ Prev</button>
          <button class="btn-primary" (click)="today()">Today</button>
          <button class="btn-primary" (click)="nextPeriod()">Next ▶</button>
          <span class="chip" *ngIf="mode() === 'Weekly'">Week of {{ periodAnchor | date:'MMM d, y' }}</span>
          <span class="chip" *ngIf="mode() === 'Monthly'">{{ periodAnchor | date:'MMMM y' }}</span>
        </div>

        <div class="app-card" style="padding:16px;">
          <h3 style="margin:0 0 8px 0;">{{ mode() }} Overview</h3>
          <div [ngStyle]="gridStyle()">
            <div *ngFor="let d of periodDays" (click)="openDay(d)" style="border:1px solid var(--bah-border); border-radius:10px; padding:8px; cursor:pointer; background:#fff;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-weight:600;">{{ d | date: 'MMM d' }}</div>
                <div style="font-size:0.75rem; color: var(--bah-text-muted);">{{ d | date: 'EEE' }}</div>
              </div>
              <div style="display:flex; gap:6px; margin-top:8px;">
                <span class="chip" style="background:#E7F8F0; color:#116149;">{{ dayTotals(d).present }}</span>
                <span class="chip" style="background:#FFF3F3; color:#8A1C1C;">+{{ dayTotals(d).late }}</span>
                <span class="chip" style="background:#FDECEC; color:#8A1C1C;">{{ dayTotals(d).absent }}</span>
              </div>
            </div>
          </div>

          <div *ngIf="detailDate" style="margin-top:16px;">
            <h4 style="margin:0 0 8px 0;">Details for {{ detailDate | date:'EEEE, MMM d, y' }}</h4>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; align-items:start;">
              <div class="app-card" style="padding:16px;">
                <h3 style="margin:0 0 8px 0;">By Class</h3>
                <div *ngFor="let c of detailReport.classes" style="padding:10px 0; border-top:1px solid var(--bah-border); display:flex; align-items:center; gap:12px;">
                  <div style="flex:1; min-width:0;">
                    <div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ c.classRef.name }}</div>
                    <div style="font-size:0.85rem; color: var(--bah-text-muted);">{{ c.classRef.schedule[0].name }} · {{ c.classRef.schedule[0].startISO | date:'shortTime' }}–{{ c.classRef.schedule[0].endISO | date:'shortTime' }}</div>
                  </div>
                  <span class="chip" style="background:#E7F8F0; color:#116149;">{{ c.present.length }}</span>
                  <span class="chip" style="background:#FFF3F3; color:#8A1C1C;">+{{ c.late.length }}</span>
                  <span class="chip" style="background:#FDECEC; color:#8A1C1C;">{{ c.missing.length }}</span>
                </div>
              </div>
              <div class="app-card" style="padding:16px;">
                <h3 style="margin:0 0 8px 0;">By Student</h3>
                <div style="overflow:auto;">
                  <table style="width:100%; border-collapse: collapse;">
                    <thead>
                    <tr style="text-align:left;">
                      <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Name</th>
                      <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Status</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr *ngFor="let s of detailReport.students" style="border-top:1px solid var(--bah-border)">
                      <td style="padding:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ s.student.StudentName }}</td>
                      <td style="padding:8px;"><span class="chip" [ngStyle]="statusChipStyle(s.status)">{{ s.status }}</span></td>
                    </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ng-template>
    </div>
  `
})
export class ReportsHomeComponent implements OnInit {
  private readonly reports = inject(ReportsService);
  private readonly api = inject(StudentApiService);

  mode = signal<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  selectedDate = new Date();
  periodAnchor = new Date();
  detailDate: Date | null = null;
  selectedSchool = signal<SelectedSchoolData | null>(null);

  ngOnInit() {
    // Subscribe to selected school changes for future school-based filtering
    this.api.selectedSchool$.subscribe(school => {
      this.selectedSchool.set(school);
      // TODO: Filter reports by school when ReportsService supports school filtering
    });
  }

  get report(): DayReport { return this.reports.getDayReport(this.selectedDate); }

  get periodDays(): Date[] {
    return this.mode() === 'Weekly' ? this.reports.getWeekDays(this.periodAnchor) : this.reports.getMonthDays(this.periodAnchor);
  }

  get detailReport(): DayReport {
    return this.reports.getDayReport(this.detailDate ?? new Date());
  }

  setMode(m: 'Daily' | 'Weekly' | 'Monthly') {
    this.mode.set(m);
    if (m === 'Weekly') {
      this.periodAnchor = this.selectedDate;
      this.detailDate = null;
    } else if (m === 'Monthly') {
      this.periodAnchor = this.selectedDate;
      this.detailDate = null;
    } else {
      this.detailDate = null;
    }
  }

  prevDay() { this.selectedDate = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth(), this.selectedDate.getDate() - 1); }
  nextDay() { this.selectedDate = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth(), this.selectedDate.getDate() + 1); }
  today() { this.selectedDate = new Date(); this.periodAnchor = new Date(); }

  prevPeriod() {
    if (this.mode() === 'Weekly') {
      const d = new Date(this.periodAnchor);
      d.setDate(d.getDate() - 7);
      this.periodAnchor = d;
    } else {
      const d = new Date(this.periodAnchor);
      d.setMonth(d.getMonth() - 1);
      this.periodAnchor = d;
    }
  }
  nextPeriod() {
    if (this.mode() === 'Weekly') {
      const d = new Date(this.periodAnchor);
      d.setDate(d.getDate() + 7);
      this.periodAnchor = d;
    } else {
      const d = new Date(this.periodAnchor);
      d.setMonth(d.getMonth() + 1);
      this.periodAnchor = d;
    }
  }

  openDay(d: Date) {
    this.detailDate = d;
  }

  dayTotals(d: Date) {
    return this.reports.getDayReport(d).totals;
  }

  activeStyle(m: 'Daily'|'Weekly'|'Monthly') {
    return this.mode() === m ? { filter: 'saturate(1.2)' } : { opacity: 0.8 } as any;
  }

  statusChipStyle(status: 'Present'|'Late'|'Absent') {
    if (status === 'Present') return { background: '#E7F8F0', color: '#116149' };
    if (status === 'Late') return { background: '#FFF3F3', color: '#8A1C1C' };
    return { background: '#FDECEC', color: '#8A1C1C' };
  }

  gridStyle() {
    if (this.mode() === 'Weekly') {
      return { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' } as any;
    }
    return { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' } as any; // monthly also 7 columns
  }
}
