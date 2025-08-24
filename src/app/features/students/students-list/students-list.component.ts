import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StudentData } from '../../../core/models/student-data';
import { StudentApiService, SelectedSchoolData, SchoolStatistics } from '../../../core/services/student-api.service';

@Component({
  selector: 'app-students-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="route-enter">
      <h2 style="margin: 8px 0 16px;">Students</h2>

      <!-- No school selected message -->
      <div *ngIf="!selectedSchool()" class="app-card" style="padding: 16px; text-align: center;">
        <div style="color: var(--bah-text-muted); font-size: 1.1rem;">
          Please select a school from the Dashboard to view students.
        </div>
      </div>

      <!-- Statistics Section -->
      <div *ngIf="selectedSchool()" class="app-card" style="padding: 16px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 12px 0; color: var(--bah-primary);">Student Statistics</h3>
        <div *ngIf="loadingStatistics()" style="color: var(--bah-text-muted); font-style: italic;">
          Loading statistics...
        </div>
        <div *ngIf="!loadingStatistics() && statistics()" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px;">
          <div style="text-align: center; padding: 12px; background: #E8F7FB; border-radius: 8px; border: 1px solid #B3E5FC;">
            <div style="font-size: 0.85rem; color: var(--bah-text-muted); margin-bottom: 4px;">Total Students</div>
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--bah-primary);">{{ statistics()?.totalStudents?.toLocaleString() || 0 }}</div>
          </div>
          <div style="text-align: center; padding: 12px; background: #E7F8F0; border-radius: 8px; border: 1px solid #B3D9C7;">
            <div style="font-size: 0.85rem; color: var(--bah-text-muted); margin-bottom: 4px;">Males</div>
            <div style="font-size: 1.5rem; font-weight: 700; color: #116149;">{{ statistics()?.maleCount?.toLocaleString() || 0 }}</div>
          </div>
          <div style="text-align: center; padding: 12px; background: #FDF2F8; border-radius: 8px; border: 1px solid #F3E8FF;">
            <div style="font-size: 0.85rem; color: var(--bah-text-muted); margin-bottom: 4px;">Females</div>
            <div style="font-size: 1.5rem; font-weight: 700; color: #BE185D;">{{ statistics()?.femaleCount?.toLocaleString() || 0 }}</div>
          </div>
        </div>
        <div *ngIf="!loadingStatistics() && !statistics()" style="color: var(--bah-text-muted); font-style: italic;">
          Unable to load statistics for this school.
        </div>
      </div>

      <!-- Loading state -->
      <div *ngIf="selectedSchool() && loading()" class="app-card" style="padding: 16px; text-align: center;">
        <div style="color: var(--bah-text-muted);">Loading students...</div>
      </div>

      <!-- Students table -->
      <div *ngIf="selectedSchool() && !loading()" class="app-card" style="padding: 8px; overflow:auto;">
        <div *ngIf="students().length === 0" style="padding: 16px; text-align: center; color: var(--bah-text-muted);">
          No students found for the selected school.
        </div>

        <table *ngIf="students().length > 0" style="width:100%; border-collapse: collapse;">
          <thead>
            <tr style="text-align:left;">
              <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Name</th>
              <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Student OpenEMIS ID</th>
              <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Grade</th>
              <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Gate In</th>
              <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Gate Out</th>
              <th style="padding:8px; border-bottom:1px solid var(--bah-border)"></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of students()" style="border-top:1px solid var(--bah-border)">
              <td style="padding:8px;">{{ s.StudentName }}</td>
              <td style="padding:8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">{{ s.StudentOpenEMIS_ID }}</td>
              <td style="padding:8px;">{{ s.EducationGrade }}</td>
              <td style="padding:8px; color: var(--bah-text-muted);">—</td>
              <td style="padding:8px; color: var(--bah-text-muted);">—</td>
              <td style="padding:8px; text-align:right;">
                <a class="btn-primary" [routerLink]="['/students', s.StudentID]">View</a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class StudentsListComponent implements OnInit {
  private readonly api = inject(StudentApiService);

  selectedSchool = signal<SelectedSchoolData | null>(null);
  students = signal<StudentData[]>([]);
  loading = signal<boolean>(false);
  statistics = signal<SchoolStatistics | null>(null);
  loadingStatistics = signal<boolean>(false);

  ngOnInit() {
    // Subscribe to selected school changes
    this.api.selectedSchool$.subscribe(school => {
      this.selectedSchool.set(school);
      this.loadStudentsForSchool(school);
      this.loadStatisticsForSchool(school);
    });
  }

  private loadStudentsForSchool(school: SelectedSchoolData | null) {
    if (!school) {
      this.students.set([]);
      return;
    }

    this.loading.set(true);
    this.api.getStudentsBySchool(school.InstitutionCode).subscribe({
      next: (response) => {
        this.students.set(response.items || []);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load students for school:', error);
        this.students.set([]);
        this.loading.set(false);
      }
    });
  }

  private loadStatisticsForSchool(school: SelectedSchoolData | null) {
    if (!school) {
      this.statistics.set(null);
      return;
    }

    this.loadingStatistics.set(true);
    this.api.getSchoolStatistics(school.InstitutionCode).subscribe({
      next: (stats) => {
        this.statistics.set(stats);
        this.loadingStatistics.set(false);
      },
      error: (error) => {
        console.error('Failed to load statistics for school:', error);
        this.statistics.set(null);
        this.loadingStatistics.set(false);
      }
    });
  }
}
