import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClassesService, ClassAttendance } from '../../../core/services/classes.service';
import { SchoolClass } from '../../../core/models/class';

@Component({
  selector: 'app-class-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <ng-container *ngIf="klass as c; else notFound">
      <div class="route-enter" style="display:flex; flex-direction:column; gap:16px;">
        <!-- Header card -->
        <div class="app-card" style="padding:16px; display:flex; align-items:center; gap:16px;">
          <div style="flex:1; min-width:0;">
            <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
              <h2 style="margin:0;">{{ c.name }}</h2>
              <span class="chip">Grade {{ c.gradeLevel }}</span>
              <span class="chip" style="background:#FFF3CD; color:#6B5B00;">{{ c.code }}</span>
            </div>
            <div style="margin-top:6px; color: var(--bah-text-muted);">
              Teacher: <strong>{{ c.teacher }}</strong> · Room: <strong>{{ c.room }}</strong>
            </div>
            <div style="margin-top:6px; color: var(--bah-text-muted);">
              {{ c.schedule[0].name }} · {{ c.schedule[0].startISO | date:'shortTime' }}–{{ c.schedule[0].endISO | date:'shortTime' }}
            </div>
          </div>
          <a routerLink="/classes" style="font-size:0.9rem;">← Back to Classes</a>
        </div>

        <!-- Attendance breakdown -->
        <div class="app-card" style="padding:16px;">
          <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:16px;">
            <div>
              <h3 style="margin:0 0 8px 0;">Present</h3>
              <div *ngIf="att.present.length; else nonePresent">
                <div *ngFor="let p of att.present" style="display:flex; justify-content:space-between; padding:8px 0; border-top:1px solid var(--bah-border);">
                  <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    {{ p.student.StudentName }}
                    <span class="chip" style="margin-left:6px;">Grade {{ p.student.grade }}</span>
                  </div>
                  <div style="color: var(--bah-text-muted);">{{ p.time | date:'shortTime' }}</div>
                </div>
              </div>
              <ng-template #nonePresent><div style="color: var(--bah-text-muted);">—</div></ng-template>
            </div>

            <div>
              <h3 style="margin:0 0 8px 0;">Late</h3>
              <div *ngIf="att.late.length; else noneLate">
                <div *ngFor="let l of att.late" style="display:flex; justify-content:space-between; padding:8px 0; border-top:1px solid var(--bah-border);">
                  <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    {{ l.student.StudentName }}
                    <span class="chip" style="margin-left:6px; background:#FFF3F3; color:#8A1C1C;">+{{ l.minutesLate }}m</span>
                  </div>
                  <div style="color: var(--bah-text-muted);">{{ l.time | date:'shortTime' }}</div>
                </div>
              </div>
              <ng-template #noneLate><div style="color: var(--bah-text-muted);">—</div></ng-template>
            </div>

            <div>
              <h3 style="margin:0 0 8px 0;">Missing</h3>
              <div *ngIf="att.missing.length; else noneMissing">
                <div *ngFor="let m of att.missing" style="padding:8px 0; border-top:1px solid var(--bah-border);">
                  {{ m.StudentName }}
                </div>
              </div>
              <ng-template #noneMissing><div style="color: var(--bah-text-muted);">—</div></ng-template>
            </div>
          </div>
        </div>

        <!-- Roster table -->
        <div class="app-card" style="padding:16px;">
          <h3 style="margin:0 0 8px 0;">Roster ({{ c.roster.length }})</h3>
          <div style="overflow:auto;">
            <table style="width:100%; border-collapse: collapse;">
              <thead>
              <tr style="text-align:left;">
                <th style="padding:8px; border-bottom:1px solid var(--bah-border)">SID</th>
                <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Name</th>
                <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Grade</th>
              </tr>
              </thead>
              <tbody>
              <tr *ngFor="let s of roster" style="border-top:1px solid var(--bah-border)">
                <td style="padding:8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">{{ s.StudentOpenEMIS_ID }}</td>
                <td style="padding:8px;">{{ s.StudentName }}</td>
                <td style="padding:8px;">{{ s.grade }}</td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ng-container>

    <ng-template #notFound>
      <div class="app-card" style="padding:16px;">Class not found. <a routerLink="/classes">Back to list</a></div>
    </ng-template>
  `
})
export class ClassDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(ClassesService);

  klass: SchoolClass | undefined = this.svc.getById(this.route.snapshot.params['id']);
  get att(): ClassAttendance {
    return this.klass ? this.svc.attendanceForClass(this.klass) : { period: { period: 0, name: '', startISO: '', endISO: '' }, present: [], late: [], missing: [] };
  }
  get roster() {
    // attendance arrays include Student objects, but roster should reflect all, including missing
    const all = [...this.att.present.map(p => p.student), ...this.att.late.map(l => l.student), ...this.att.missing];
    // remove duplicates by id
    const byId = new Map(all.map(s => [s.id, s]));
    return Array.from(byId.values());
  }
}
