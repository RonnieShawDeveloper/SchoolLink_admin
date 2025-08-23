import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { StudentApiService, SearchResponse } from '../../../core/services/student-api.service';
import { StudentData } from '../../../core/models/student-data';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { Subject, of } from 'rxjs';

@Component({
  selector: 'app-admin-student-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="route-enter" style="display:flex; flex-direction:column; gap:16px;">
      <div style="display:grid; grid-template-columns: 1fr 2fr; gap:16px; align-items:start;">
        <!-- Search Panel -->
        <div class="app-card" style="padding:16px;">
          <h3 style="margin:0 0 8px 0;">Find Student</h3>
          <div style="font-size:0.85rem; color: var(--bah-text-muted); margin-bottom:6px;">Student, Parent, Guardian or Student ID</div>
          <input type="text" class="app-input" placeholder="Type 3+ characters" (input)="onSearch($event)" style="width:100%; padding:8px; border:1px solid var(--bah-border); border-radius:8px;" />
          <div *ngIf="searching()" style="margin-top:8px; color: var(--bah-text-muted);">Searching…</div>
          <div *ngIf="results().length" style="margin-top:8px; max-height:240px; overflow:auto; border-top:1px solid var(--bah-border);">
            <div *ngFor="let s of results()" (click)="select(s)"
                 style="padding:8px; border-bottom:1px solid var(--bah-border); cursor:pointer; display:flex; justify-content:space-between;">
              <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                <div style="font-weight:600;">{{ s.StudentName || '—' }}</div>
                <div style="font-size:0.85rem; color: var(--bah-text-muted);">{{ s.InstitutionName || '—' }}</div>
              </div>
              <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">{{ s.StudentOpenEMIS_ID }}</div>
            </div>
          </div>
          <div *ngIf="!results().length && lastQuery && !searching()" style="margin-top:8px; color: var(--bah-text-muted);">No matches.</div>
          <div style="margin-top:12px; display:flex; gap:8px;">
            <button class="btn-primary" (click)="newStudent()">New Student</button>
            <button class="btn-primary" [disabled]="!formEnabled()" (click)="save()">Save</button>
          </div>
        </div>

        <!-- Editor Form -->
        <div class="app-card" style="padding:16px;">
          <h3 style="margin:0 0 8px 0;">Edit/Add Student</h3>
          <form [formGroup]="form" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <!-- Basic -->
            <div style="grid-column: 1 / -1; font-weight:600; margin-top:4px;">Basic</div>
            <label>StudentID<input class="app-input" formControlName="StudentID" type="number" /></label>
            <label>Student OpenEMIS ID<input class="app-input" formControlName="StudentOpenEMIS_ID" /></label>
            <label>Student Name<input class="app-input" formControlName="StudentName" /></label>
            <label>Student Status<input class="app-input" formControlName="StudentStatus" /></label>
            <label>Gender<input class="app-input" formControlName="Gender" /></label>
            <label>Date Of Birth<input class="app-input" formControlName="DateOfBirth" placeholder="YYYY-MM-DD or DD/MM/YYYY" /></label>
            <label>Age<input class="app-input" formControlName="Age" type="number" /></label>
            <label>Address<input class="app-input" formControlName="Address" /></label>

            <!-- Institution -->
            <div style="grid-column: 1 / -1; font-weight:600; margin-top:8px;">Institution</div>
            <label>Institution Code<input class="app-input" formControlName="InstitutionCode" /></label>
            <label>Institution Name<input class="app-input" formControlName="InstitutionName" /></label>
            <label>Ownership<input class="app-input" formControlName="Ownewship" /></label>
            <label>Type<input class="app-input" formControlName="Type" /></label>
            <label>Sector<input class="app-input" formControlName="Sector" /></label>
            <label>Provider<input class="app-input" formControlName="Provider" /></label>

            <!-- Academic -->
            <div style="grid-column: 1 / -1; font-weight:600; margin-top:8px;">Academic</div>
            <label>Education Grade<input class="app-input" formControlName="EducationGrade" /></label>
            <label>Academic Period<input class="app-input" formControlName="AcademicPeriod" /></label>
            <label>Start Date<input class="app-input" formControlName="StartDate" placeholder="YYYY-MM-DD" /></label>
            <label>End Date<input class="app-input" formControlName="EndDate" placeholder="YYYY-MM-DD" /></label>
            <label>Class Name<input class="app-input" formControlName="ClassName" /></label>

            <!-- Mother -->
            <div style="grid-column: 1 / -1; font-weight:600; margin-top:8px;">Mother</div>
            <label>Mother Name<input class="app-input" formControlName="MotherName" /></label>
            <label>Mother Contact<input class="app-input" formControlName="MotherContact" /></label>
            <label>Mother Email<input class="app-input" formControlName="MotherEmail" /></label>

            <!-- Father -->
            <div style="grid-column: 1 / -1; font-weight:600; margin-top:8px;">Father</div>
            <label>Father Name<input class="app-input" formControlName="FatherName" /></label>
            <label>Father Contact<input class="app-input" formControlName="FatherContact" /></label>
            <label>Father Email<input class="app-input" formControlName="FatherEmail" /></label>

            <!-- Guardian -->
            <div style="grid-column: 1 / -1; font-weight:600; margin-top:8px;">Guardian</div>
            <label>Guardian Name<input class="app-input" formControlName="GuardianName" /></label>
            <label>Guardian Telephone<input class="app-input" formControlName="GuardianTelephone" /></label>
            <label>Guardian Email<input class="app-input" formControlName="GuardianEmail" /></label>
          </form>
        </div>
      </div>
    </div>
  `
})
export class AdminStudentEditorComponent {
  private readonly api = inject(StudentApiService);
  private readonly fb = inject(FormBuilder);

  form: FormGroup = this.fb.group({
    // basics
    StudentID: [null],
    StudentOpenEMIS_ID: [''],
    StudentName: [''],
    StudentStatus: [''],
    Gender: [''],
    DateOfBirth: [''],
    Age: [null],
    Address: [''],
    // institution
    InstitutionCode: [''],
    InstitutionName: [''],
    Ownewship: [''],
    Type: [''],
    Sector: [''],
    Provider: [''],
    // academic
    EducationGrade: [''],
    AcademicPeriod: [''],
    StartDate: [''],
    EndDate: [''],
    ClassName: [''],
    // mother
    MotherName: [''],
    MotherContact: [''],
    MotherEmail: [''],
    // father
    FatherName: [''],
    FatherContact: [''],
    FatherEmail: [''],
    // guardian
    GuardianName: [''],
    GuardianTelephone: [''],
    GuardianEmail: [''],
  });

  private search$ = new Subject<string>();
  results = signal<StudentData[]>([]);
  searching = signal<boolean>(false);
  formEnabled = signal<boolean>(false);
  lastQuery = '';

  constructor() {
    this.search$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((q) => {
          this.lastQuery = q;
          if (!q || q.length < 3) return of({ items: [], total: 0, page: 1, totalPages: 0 } as SearchResponse);
          this.searching.set(true);
          return this.api.searchStudents(q);
        })
      )
      .subscribe({
        next: (res) => { this.results.set(res.items || []); this.searching.set(false); },
        error: () => { this.results.set([]); this.searching.set(false); }
      });
  }

  onSearch(ev: Event) {
    const val = (ev.target as HTMLInputElement).value.trim();
    this.search$.next(val);
  }

  select(s: StudentData) {
    this.results.set([]);
    this.form.reset({ ...s });
    this.formEnabled.set(true);
  }

  newStudent() {
    this.results.set([]);
    this.form.reset({ StudentID: null });
    this.formEnabled.set(true);
  }

  save() {
    if (!this.formEnabled()) return;
    const payload = { ...this.form.value } as Partial<StudentData>;
    this.api.updateStudent(payload).subscribe({
      next: (res) => {
        // reflect returned IDs if any
        if (res?.insertId && !this.form.value.StudentID) {
          this.form.patchValue({ StudentID: res.insertId });
        }
        alert('Saved successfully.');
      },
      error: (err) => {
        console.error(err);
        alert('Save failed: ' + (err?.message || 'Unknown error'));
      }
    });
  }
}
