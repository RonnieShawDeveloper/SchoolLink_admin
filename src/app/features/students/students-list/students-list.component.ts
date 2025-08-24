import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StudentsService } from '../../../core/services/students.service';
import { StudentRecord } from '../../../core/models/student-data';
import { StudentApiService, SelectedSchoolData } from '../../../core/services/student-api.service';

@Component({
  selector: 'app-students-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="route-enter">
      <h2 style="margin: 8px 0 16px;">Students</h2>
      <div class="app-card" style="padding: 8px; overflow:auto;">
        <table style="width:100%; border-collapse: collapse;">
          <thead>
            <tr style="text-align:left;">
              <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Name</th>
              <th style="padding:8px; border-bottom:1px solid var(--bah-border)">SID</th>
              <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Grade</th>
              <th style="padding:8px; border-bottom:1px solid var(--bah-border)"></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of students()" style="border-top:1px solid var(--bah-border)">
              <td style="padding:8px;">{{ s.StudentName }}</td>
              <td style="padding:8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">{{ s.StudentOpenEMIS_ID }}</td>
              <td style="padding:8px;">{{ s.grade }}</td>
              <td style="padding:8px; text-align:right;">
                <a class="btn-primary" [routerLink]="['/students', s.id]">View</a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class StudentsListComponent implements OnInit {
  private readonly svc = inject(StudentsService);
  private readonly api = inject(StudentApiService);

  private allStudents: StudentRecord[] = this.svc.list();
  selectedSchool = signal<SelectedSchoolData | null>(null);

  // Computed property to filter students based on selected school
  students = computed(() => {
    const school = this.selectedSchool();
    if (!school) {
      return this.allStudents; // Show all students when no school selected
    }

    // Filter students by InstitutionCode
    return this.allStudents.filter(student =>
      student.InstitutionCode === school.InstitutionCode
    );
  });

  ngOnInit() {
    // Subscribe to selected school changes
    this.api.selectedSchool$.subscribe(school => {
      this.selectedSchool.set(school);
    });
  }
}
