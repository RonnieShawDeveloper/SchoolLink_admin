import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ClassesService } from '../../../core/services/classes.service';
import { SchoolClass } from '../../../core/models/class';

@Component({
  selector: 'app-classes-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="route-enter">
      <h2 style="margin: 8px 0 16px;">Classes</h2>
      <div class="app-card" style="padding: 8px; overflow:auto;">
        <table style="width:100%; border-collapse: collapse;">
          <thead>
          <tr style="text-align:left;">
            <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Code</th>
            <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Name</th>
            <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Grade</th>
            <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Teacher</th>
            <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Room</th>
            <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Period</th>
            <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Present</th>
            <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Missing</th>
            <th style="padding:8px; border-bottom:1px solid var(--bah-border)"></th>
          </tr>
          </thead>
          <tbody>
          <tr *ngFor="let c of classes" style="border-top:1px solid var(--bah-border)">
            <td style="padding:8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">{{ c.code }}</td>
            <td style="padding:8px;">{{ c.name }}</td>
            <td style="padding:8px;">{{ c.gradeLevel }}</td>
            <td style="padding:8px;">{{ c.teacher }}</td>
            <td style="padding:8px;">{{ c.room }}</td>
            <td style="padding:8px; white-space:nowrap;">{{ c.schedule[0].name }} · {{ c.schedule[0].startISO | date:'shortTime' }}–{{ c.schedule[0].endISO | date:'shortTime' }}</td>
            <td style="padding:8px;">
              <span class="chip" style="background:#E7F8F0; color:#116149;">{{ attendance(c).present.length }}<span *ngIf="attendance(c).late.length"> +{{ attendance(c).late.length }} late</span></span>
            </td>
            <td style="padding:8px;">
              <span class="chip" style="background:#FDECEC; color:#8A1C1C;">{{ attendance(c).missing.length }}</span>
            </td>
            <td style="padding:8px; text-align:right;">
              <a class="btn-primary" [routerLink]="['/classes', c.id]">View</a>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class ClassesListComponent {
  private readonly svc = inject(ClassesService);
  classes: SchoolClass[] = this.svc.list();

  attendance(c: SchoolClass) {
    return this.svc.attendanceForClass(c);
  }
}
