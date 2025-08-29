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

      <!-- Bulk Actions Toolbar -->
      <div *ngIf="selectedSchool() && !loading() && students().length > 0 && selectedStudents().length > 0" class="app-card" style="padding: 12px; margin-bottom: 8px; background: #E8F7FB; border: 1px solid #B3E5FC;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div>
            <strong>{{ selectedStudents().length }}</strong> student(s) selected
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn-primary" (click)="bulkGateIn()" style="padding: 6px 12px; font-size: 0.85rem;">
              Gate In
            </button>
            <button class="btn-primary" (click)="bulkGateOut()" style="padding: 6px 12px; font-size: 0.85rem;">
              Gate Out
            </button>
            <button class="btn-secondary" (click)="bulkRemove()" style="padding: 6px 12px; font-size: 0.85rem; background: #dc3545;">
              Remove
            </button>
            <button class="btn-secondary" (click)="clearSelection()" style="padding: 6px 12px; font-size: 0.85rem;">
              Clear Selection
            </button>
          </div>
        </div>
      </div>

      <!-- Students table -->
      <div *ngIf="selectedSchool() && !loading()" class="app-card" style="padding: 8px; overflow:auto;">
        <div *ngIf="students().length === 0" style="padding: 16px; text-align: center; color: var(--bah-text-muted);">
          No students found for the selected school.
        </div>

        <table *ngIf="students().length > 0" style="width:100%; border-collapse: collapse;">
          <thead>
            <tr style="text-align:left;">
              <th style="padding:8px; border-bottom:1px solid var(--bah-border); width: 40px;">
                <input type="checkbox"
                       [checked]="isAllSelected()"
                       [indeterminate]="isPartiallySelected()"
                       (change)="toggleSelectAll($event)"
                       style="cursor: pointer;">
              </th>
              <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Photo and Name</th>
              <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Student OpenEMIS ID</th>
              <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Grade</th>
              <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Gate In</th>
              <th style="padding:8px; border-bottom:1px solid var(--bah-border)">Gate Out</th>
              <th style="padding:8px; border-bottom:1px solid var(--bah-border)"></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of students()"
                [ngStyle]="getRowStyle(s)"
                style="border-top:1px solid var(--bah-border)">
              <td style="padding:8px;">
                <input type="checkbox"
                       [checked]="isStudentSelected(s.StudentID)"
                       (change)="toggleStudentSelection(s.StudentID, $event)"
                       style="cursor: pointer;">
              </td>
              <td style="padding:8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="width: 36px; height: 36px; border-radius: 8px; overflow: hidden; border: 1px solid var(--bah-border); flex: 0 0 36px; background: #f8f9fa;">
                    <img
                      [src]="s.StudentOpenEMIS_ID ? buildThumbUrl(s.StudentOpenEMIS_ID) : getFallbackDataUrl()"
                      (error)="onThumbError($event)"
                      [alt]="(s.StudentName || 'Student') + ' thumbnail'"
                      style="width: 100%; height: 100%; object-fit: cover;"
                    />
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span>{{ s.StudentName }}</span>
                    <span [ngStyle]="getGenderStyle(s.Gender)">{{ getGenderText(s.Gender) }}</span>
                  </div>
                </div>
              </td>
              <td style="padding:8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">{{ s.StudentOpenEMIS_ID }}</td>
              <td style="padding:8px;">{{ s.EducationGrade }}</td>
              <td style="padding:8px;">{{ getGateInTime(s.StudentOpenEMIS_ID) }}</td>
              <td style="padding:8px;">{{ getGateOutTime(s.StudentOpenEMIS_ID) }}</td>
              <td style="padding:8px; text-align:right;">
                <a class="btn-primary"
                   [routerLink]="['/students', s.StudentID]"
                   style="padding: 4px 8px; font-size: 0.8rem; margin: 2px 0; display: inline-block; min-width: 50px; text-align: center;">
                  View
                </a>
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
  private readonly cacheBust = Date.now();

  selectedSchool = signal<SelectedSchoolData | null>(null);
  students = signal<StudentData[]>([]);
  loading = signal<boolean>(false);
  statistics = signal<SchoolStatistics | null>(null);
  loadingStatistics = signal<boolean>(false);
  selectedStudents = signal<number[]>([]);
  gateTimes = signal<Record<string, { in?: string; out?: string }>>({});

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
      this.gateTimes.set({});
      return;
    }

    this.loading.set(true);
    this.api.getStudentsBySchool(school.InstitutionCode).subscribe({
      next: (response) => {
        const items = response.items || [];
        this.students.set(items);
        this.loading.set(false);
        this.loadScansForStudents(items);
      },
      error: (error) => {
        console.error('Failed to load students for school:', error);
        this.students.set([]);
        this.gateTimes.set({});
        this.loading.set(false);
      }
    });
  }

  private loadScansForStudents(students: StudentData[]): void {
    const ids = (students || []).map(s => s.StudentOpenEMIS_ID).filter((v): v is string => !!v);
    if (ids.length === 0) {
      this.gateTimes.set({});
      return;
    }
    this.api.getTodayScans(ids).subscribe({
      next: (res) => {
        const map: Record<string, { in?: string; out?: string }> = {};
        const tz = (res as any)?.timezone as string | undefined;
        const items = (res && (res as any).items) || [];
        for (const it of items) {
          const key = String(it.student_id).trim();
          const inStr = this.formatLocal12h(it.latestInAt, tz);
          const outStr = this.formatLocal12h(it.latestOutAt, tz);
          map[key] = {};
          if (inStr) map[key].in = inStr;
          if (outStr) map[key].out = outStr;
        }
        this.gateTimes.set(map);
      },
      error: (err) => {
        console.error('Failed to load today\'s scans:', err);
        this.gateTimes.set({});
      }
    });
  }

  private formatLocal12h(ts?: string, timezone?: string): string | undefined {
    if (!ts) return undefined;
    const d = new Date(ts);
    if (isNaN(d.getTime())) return undefined;
    try {
      const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
      if (timezone) (opts as any).timeZone = timezone;
      return new Intl.DateTimeFormat('en-US', opts).format(d);
    } catch {
      // Fallback simple manual formatting if locale or IANA tz fails
      const hours = d.getHours();
      const minutes = d.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      const mm = minutes.toString().padStart(2, '0');
      return `${h12}:${mm} ${ampm}`;
    }
  }

  getGateInTime(studentOpenEmisId?: string): string {
    const key = (studentOpenEmisId || '').trim();
    if (!key) return '—';
    const map = this.gateTimes();
    return (map[key]?.in) || '—';
  }

  getGateOutTime(studentOpenEmisId?: string): string {
    const key = (studentOpenEmisId || '').trim();
    if (!key) return '—';
    const map = this.gateTimes();
    return (map[key]?.out) || '—';
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

  // Selection management methods
  isStudentSelected(studentId: number): boolean {
    return this.selectedStudents().includes(studentId);
  }

  toggleStudentSelection(studentId: number, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const currentSelection = this.selectedStudents();

    if (checkbox.checked) {
      if (!currentSelection.includes(studentId)) {
        this.selectedStudents.set([...currentSelection, studentId]);
      }
    } else {
      this.selectedStudents.set(currentSelection.filter(id => id !== studentId));
    }
  }

  isAllSelected(): boolean {
    const currentStudents = this.students();
    const selectedIds = this.selectedStudents();
    return currentStudents.length > 0 && currentStudents.every(s => selectedIds.includes(s.StudentID));
  }

  isPartiallySelected(): boolean {
    const selectedIds = this.selectedStudents();
    const currentStudents = this.students();
    return selectedIds.length > 0 && selectedIds.length < currentStudents.length;
  }

  toggleSelectAll(event: Event): void {
    const checkbox = event.target as HTMLInputElement;

    if (checkbox.checked) {
      // Select all students
      const allStudentIds = this.students().map(s => s.StudentID);
      this.selectedStudents.set(allStudentIds);
    } else {
      // Deselect all
      this.selectedStudents.set([]);
    }
  }

  clearSelection(): void {
    this.selectedStudents.set([]);
  }

  // Gender display methods
  getGenderText(gender: string | undefined): string {
    if (!gender) return '(Unknown)';

    const g = gender.toLowerCase();
    if (g === 'm' || g === 'male') return '(Male)';
    if (g === 'f' || g === 'female') return '(Female)';
    return '(Unknown)';
  }

  getGenderStyle(gender: string | undefined): any {
    if (!gender) return { color: '#dc3545', fontSize: '0.8rem', fontWeight: '500' };

    const g = gender.toLowerCase();
    if (g === 'm' || g === 'male') return { color: '#116149', fontSize: '0.8rem', fontWeight: '500' };
    if (g === 'f' || g === 'female') return { color: '#BE185D', fontSize: '0.8rem', fontWeight: '500' };
    return { color: '#dc3545', fontSize: '0.8rem', fontWeight: '500' };
  }

  // Row styling method
  getRowStyle(student: StudentData): any {
    if (student.StudentStatus === 'Not Enrolled') {
      return {
        opacity: '0.5',
        background: '#f8f9fa',
        color: '#6c757d'
      };
    }
    return {};
  }

  // Thumbnail helpers
  buildThumbUrl(id: string): string {
    return `https://schoollink-student-photos.s3.us-east-1.amazonaws.com/student-photos/${id}-thumb.jpg?t=${this.cacheBust}`;
  }

  getFallbackDataUrl(): string {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'>
  <rect width='100%' height='100%' rx='8' ry='8' fill='#f8f9fa'/>
  <line x1='15' y1='15' x2='45' y2='45' stroke='#dc3545' stroke-width='6' stroke-linecap='round'/>
  <line x1='45' y1='15' x2='15' y2='45' stroke='#dc3545' stroke-width='6' stroke-linecap='round'/>
</svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  onThumbError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (!img) return;
    if ((img as any).dataset && (img as any).dataset.fallbackApplied === '1') return;
    if ((img as any).dataset) (img as any).dataset.fallbackApplied = '1';
    img.src = this.getFallbackDataUrl();
  }

  // Bulk operation methods
  bulkGateIn(): void {
    const selectedIds = this.selectedStudents();
    if (selectedIds.length === 0) return;

    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const timeInput = prompt(`Enter Gate In time for ${selectedIds.length} selected student(s):`, currentTime);
    if (!timeInput) return;

    // Here you would typically call an API to update gate in times
    // For now, we'll just show a confirmation
    alert(`Gate In time "${timeInput}" has been recorded for ${selectedIds.length} student(s).`);
    this.clearSelection();
  }

  bulkGateOut(): void {
    const selectedIds = this.selectedStudents();
    if (selectedIds.length === 0) return;

    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const timeInput = prompt(`Enter Gate Out time for ${selectedIds.length} selected student(s):`, currentTime);
    if (!timeInput) return;

    // Here you would typically call an API to update gate out times
    // For now, we'll just show a confirmation
    alert(`Gate Out time "${timeInput}" has been recorded for ${selectedIds.length} student(s).`);
    this.clearSelection();
  }

  bulkRemove(): void {
    const selectedIds = this.selectedStudents();
    if (selectedIds.length === 0) return;

    const confirmed = confirm(`Are you sure you want to remove ${selectedIds.length} selected student(s)? This will set their status to "Not Enrolled".`);
    if (!confirmed) return;

    // Update student status to "Not Enrolled" for selected students
    const updatedStudents = this.students().map(student => {
      if (selectedIds.includes(student.StudentID)) {
        return { ...student, StudentStatus: 'Not Enrolled' };
      }
      return student;
    });

    this.students.set(updatedStudents);
    alert(`${selectedIds.length} student(s) have been marked as "Not Enrolled".`);
    this.clearSelection();

    // Here you would typically call an API to update the database
    // The actual database update would be implemented later
  }
}
