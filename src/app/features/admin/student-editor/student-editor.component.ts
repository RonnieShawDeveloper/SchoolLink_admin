import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { StudentApiService, SearchResponse } from '../../../core/services/student-api.service';
import { StudentData } from '../../../core/models/student-data';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Subject, of } from 'rxjs';

@Component({
  selector: 'app-admin-student-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  styles: [
    `:host { display:block; }
     .editor-root { display:flex; flex-direction:column; gap:16px; }
     .search-card { padding:16px; background:#E6EAEE; border:1px solid #0B4F6C; border-radius:12px; box-shadow: 0 4px 10px rgba(0,0,0,0.08); }
     .form-sections { display:grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap:16px; }
     @media (max-width: 1100px) { .form-sections { grid-template-columns: 1fr; } }
     .fieldset-card { background:#E6EAEE; border:1px solid #0B4F6C; border-radius:12px; padding:16px; box-shadow: 0 6px 14px rgba(0,0,0,0.10); }
     .section-title { margin:0 0 8px 0; font-weight:700; color:#0B4F6C; }
     .field-grid { display:grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap:12px; }
     @media (max-width: 800px) { .field-grid { grid-template-columns: 1fr; } }
     .field { display:flex; flex-direction:column; min-width:0; }
     .field-label { font-size:0.78rem; font-weight:600; color: var(--bah-text-muted); margin-bottom:4px; }
     .app-input { width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid var(--bah-border); border-radius:10px; background:#fff; box-shadow: inset 0 1px 1.5px rgba(0,0,0,0.06); transition: border-color .15s ease, box-shadow .15s ease; }
     .app-input:focus { outline:none; border-color: var(--bah-primary); box-shadow: 0 0 0 3px rgba(0,163,199,0.15), inset 0 1px 1.5px rgba(0,0,0,0.06); }
     textarea.app-input { min-height:70px; resize:vertical; }
    `
  ],
  template: `
    <div class="route-enter editor-root">
      <!-- Search (full width) -->
      <div class="app-card search-card">
        <h3 style="margin:0 0 8px 0;">Find Student</h3>
        <div style="font-size:0.85rem; color: var(--bah-text-muted); margin-bottom:6px;">Student, Parent, Guardian or Student ID</div>
        <input type="text" class="app-input" placeholder="Type 3+ characters" (input)="onSearch($event)" />
        <div *ngIf="searching()" style="margin-top:8px; color: var(--bah-text-muted);">Searching…</div>
      <div *ngIf="results().length" style="margin-top:8px; max-height:240px; overflow:auto; border-top:1px solid var(--bah-border);">
          <div *ngFor="let s of results()" (click)="select(s)"
               style="padding:8px; border-bottom:1px solid var(--bah-border); cursor:pointer; display:flex; justify-content:space-between;">
            <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              <div style="font-weight:600;">{{ s.StudentName || '—' }}</div>
              <div style="font-size:0.85rem; color: var(--bah-text-muted);">DOB: {{ formatDateForDisplay(s.DateOfBirth) || '—' }}</div>
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

      <!-- Editor Form Sections -->
      <div class="form-sections" [formGroup]="form">
        <!-- Student Personal -->
        <section class="fieldset-card">
          <h3 class="section-title">Student Personal</h3>
          <div class="field-grid">
            <div class="field"><label class="field-label">SchoolLink ID</label><input class="app-input" formControlName="StudentID" type="number" [disabled]="true" /></div>
            <div class="field"><label class="field-label">Student OpenEMIS ID</label><input class="app-input" formControlName="StudentOpenEMIS_ID" [disabled]="true" /></div>
            <div class="field"><label class="field-label">Student Name</label><input class="app-input" formControlName="StudentName" /></div>
            <div class="field"><label class="field-label">Student Status</label><input class="app-input" formControlName="StudentStatus" /></div>
            <div class="field"><label class="field-label">Gender</label><input class="app-input" formControlName="Gender" /></div>
            <div class="field"><label class="field-label">Date Of Birth (DD-MM-YYYY)</label><input class="app-input" formControlName="DateOfBirth" placeholder="DD-MM-YYYY" /></div>
            <div class="field"><label class="field-label">Age</label><input class="app-input" formControlName="Age" type="number" /></div>
            <div class="field"><label class="field-label">Preferred Nationality</label><input class="app-input" formControlName="PreferredNationality" /></div>
            <div class="field"><label class="field-label">All Nationalities</label><input class="app-input" formControlName="AllNationalities" /></div>
            <div class="field"><label class="field-label">Default Identity Type</label><input class="app-input" formControlName="DefaultIdentitytype" /></div>
            <div class="field"><label class="field-label">Identity Number</label><input class="app-input" formControlName="IdentityNumber" /></div>
            <div class="field"><label class="field-label">Risk Index</label><input class="app-input" formControlName="RiskIndex" /></div>
            <div class="field" style="grid-column:1 / -1;"><label class="field-label">Address</label><input class="app-input" formControlName="Address" /></div>
            <div class="field"><label class="field-label">NIB2</label><input class="app-input" formControlName="NIB2" /></div>
            <div class="field" style="grid-column:1 / -1;"><label class="field-label">Extra Activities</label><textarea class="app-input" formControlName="ExtraActivities" rows="2"></textarea></div>
          </div>
        </section>

        <!-- Institution & Location -->
        <section class="fieldset-card">
          <h3 class="section-title">Institution & Location</h3>
          <div class="field-grid">
            <div class="field"><label class="field-label">Institution Code</label><input class="app-input" formControlName="InstitutionCode" [disabled]="true" /></div>
            <div class="field"><label class="field-label">Institution Name</label><input class="app-input" formControlName="InstitutionName" [disabled]="true" /></div>
            <div class="field"><label class="field-label">Ownership</label><input class="app-input" formControlName="Ownewship" [disabled]="true" /></div>
            <div class="field"><label class="field-label">Type</label><input class="app-input" formControlName="Type" [disabled]="true" /></div>
            <div class="field"><label class="field-label">Sector</label><input class="app-input" formControlName="Sector" [disabled]="true" /></div>
            <div class="field"><label class="field-label">Provider</label><input class="app-input" formControlName="Provider" [disabled]="true" /></div>
            <div class="field"><label class="field-label">Locality</label><input class="app-input" formControlName="Locality" [disabled]="true" /></div>
            <div class="field"><label class="field-label">Area Education Code</label><input class="app-input" formControlName="AreaEducationCode" [disabled]="true" /></div>
            <div class="field"><label class="field-label">Area Education</label><input class="app-input" formControlName="AreaEducation" [disabled]="true" /></div>
            <div class="field"><label class="field-label">Area Administrative Code</label><input class="app-input" formControlName="AreaAdministrativeCode" [disabled]="true" /></div>
            <div class="field"><label class="field-label">Area Administrative</label><input class="app-input" formControlName="AreaAdministrative" [disabled]="true" /></div>
          </div>
        </section>

        <!-- Academic -->
        <section class="fieldset-card">
          <h3 class="section-title">Academic</h3>
          <div class="field-grid">
            <div class="field"><label class="field-label">Education Grade</label><input class="app-input" formControlName="EducationGrade" /></div>
            <div class="field"><label class="field-label">Academic Period</label><input class="app-input" formControlName="AcademicPeriod" /></div>
            <div class="field"><label class="field-label">Start Date (DD-MM-YYYY)</label><input class="app-input" formControlName="StartDate" placeholder="DD-MM-YYYY" /></div>
            <div class="field"><label class="field-label">End Date (DD-MM-YYYY)</label><input class="app-input" formControlName="EndDate" placeholder="DD-MM-YYYY" /></div>
            <div class="field"><label class="field-label">Class Name</label><input class="app-input" formControlName="ClassName" /></div>
            <div class="field"><label class="field-label">Last Grade Level Enrolled</label><input class="app-input" formControlName="LastGradeLevelEnrolled" /></div>
            <div class="field" style="grid-column:1 / -1;"><label class="field-label">Previous School</label><input class="app-input" formControlName="PreviousSchool" /></div>
          </div>
        </section>

        <!-- Mother -->
        <section class="fieldset-card">
          <h3 class="section-title">Mother</h3>
          <div class="field-grid">
            <div class="field"><label class="field-label">Mother OpenEMIS ID</label><input class="app-input" formControlName="MotherOpenEMIS_ID" /></div>
            <div class="field"><label class="field-label">Mother Name</label><input class="app-input" formControlName="MotherName" /></div>
            <div class="field"><label class="field-label">Mother Contact</label><input class="app-input" formControlName="MotherContact" /></div>
            <div class="field"><label class="field-label">Mother First Name</label><input class="app-input" formControlName="MotherFirstName" /></div>
            <div class="field"><label class="field-label">Mother Last Name</label><input class="app-input" formControlName="MotherLastName" /></div>
            <div class="field"><label class="field-label">Mother Address</label><input class="app-input" formControlName="MotherAddress" /></div>
            <div class="field"><label class="field-label">Mother Telephone</label><input class="app-input" formControlName="MotherTelephone" /></div>
            <div class="field"><label class="field-label">Mother Email</label><input class="app-input" formControlName="MotherEmail" /></div>
            <div class="field"><label class="field-label">Mother DOB (DD-MM-YYYY)</label><input class="app-input" formControlName="MotherDOB" placeholder="DD-MM-YYYY" /></div>
            <div class="field"><label class="field-label">Mother Is Deceased</label><input class="app-input" formControlName="MotherIsDeceased" /></div>
            <div class="field"><label class="field-label">Mother Nationality</label><input class="app-input" formControlName="MotherNationality" /></div>
          </div>
        </section>

        <!-- Father -->
        <section class="fieldset-card">
          <h3 class="section-title">Father</h3>
          <div class="field-grid">
            <div class="field"><label class="field-label">Father OpenEMIS ID</label><input class="app-input" formControlName="FatherOpenEMIS_ID" /></div>
            <div class="field"><label class="field-label">Father Name</label><input class="app-input" formControlName="FatherName" /></div>
            <div class="field"><label class="field-label">Father Contact</label><input class="app-input" formControlName="FatherContact" /></div>
            <div class="field"><label class="field-label">Father First Name</label><input class="app-input" formControlName="FatherFirstName" /></div>
            <div class="field"><label class="field-label">Father Last Name</label><input class="app-input" formControlName="FatherLastName" /></div>
            <div class="field"><label class="field-label">Father Address</label><input class="app-input" formControlName="FatherAddress" /></div>
            <div class="field"><label class="field-label">Father Telephone</label><input class="app-input" formControlName="FatherTelephone" /></div>
            <div class="field"><label class="field-label">Father Email</label><input class="app-input" formControlName="FatherEmail" /></div>
            <div class="field"><label class="field-label">Father DOB (DD-MM-YYYY)</label><input class="app-input" formControlName="FatherDOB" placeholder="DD-MM-YYYY" /></div>
            <div class="field"><label class="field-label">Father Is Deceased</label><input class="app-input" formControlName="FatherIsDeceased" /></div>
            <div class="field"><label class="field-label">Father Nationality</label><input class="app-input" formControlName="FatherNationality" /></div>
          </div>
        </section>

        <!-- Guardian -->
        <section class="fieldset-card">
          <h3 class="section-title">Guardian</h3>
          <div class="field-grid">
            <div class="field"><label class="field-label">Guardian OpenEMIS ID</label><input class="app-input" formControlName="GuardianOpenEMIS_ID" /></div>
            <div class="field"><label class="field-label">Guardian Name</label><input class="app-input" formControlName="GuardianName" /></div>
            <div class="field"><label class="field-label">Guardian Gender</label><input class="app-input" formControlName="GuardianGender" /></div>
            <div class="field"><label class="field-label">Guardian Date Of Birth (DD-MM-YYYY)</label><input class="app-input" formControlName="GuardianDateOfBirth" placeholder="DD-MM-YYYY" /></div>
            <div class="field"><label class="field-label">Guardian First Name</label><input class="app-input" formControlName="GuardianFirstName" /></div>
            <div class="field"><label class="field-label">Guardian Last Name</label><input class="app-input" formControlName="GuardianLastName" /></div>
            <div class="field"><label class="field-label">Guardian Address</label><input class="app-input" formControlName="GuardianAddress" /></div>
            <div class="field"><label class="field-label">Guardian Telephone</label><input class="app-input" formControlName="GuardianTelephone" /></div>
            <div class="field"><label class="field-label">Guardian Email</label><input class="app-input" formControlName="GuardianEmail" /></div>
            <div class="field"><label class="field-label">Guardian DOB (DD-MM-YYYY)</label><input class="app-input" formControlName="GuardianDOB" placeholder="DD-MM-YYYY" /></div>
            <div class="field"><label class="field-label">Guardian Is Deceased</label><input class="app-input" formControlName="GuardianIsDeceased" /></div>
            <div class="field"><label class="field-label">Guardian Nationality</label><input class="app-input" formControlName="GuardianNationality" /></div>
          </div>
        </section>

        <!-- Living Situation -->
        <section class="fieldset-card">
          <h3 class="section-title">Living Situation</h3>
          <div class="field-grid">
            <div class="field"><label class="field-label">Student Living With</label><input class="app-input" formControlName="Studentlivingwith" /></div>
            <div class="field"><label class="field-label">Student Living With Guardian</label><input class="app-input" formControlName="StudentLivingWithGuardian" /></div>
          </div>
        </section>
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
    PreferredNationality: [''],
    AllNationalities: [''],
    DefaultIdentitytype: [''],
    IdentityNumber: [''],
    RiskIndex: [''],
    Address: [''],
    NIB2: [''],
    ExtraActivities: [''],
    // institution & location
    InstitutionCode: [''],
    InstitutionName: [''],
    Ownewship: [''],
    Type: [''],
    Sector: [''],
    Provider: [''],
    Locality: [''],
    AreaEducationCode: [''],
    AreaEducation: [''],
    AreaAdministrativeCode: [''],
    AreaAdministrative: [''],
    // academic
    EducationGrade: [''],
    AcademicPeriod: [''],
    StartDate: [''],
    EndDate: [''],
    ClassName: [''],
    LastGradeLevelEnrolled: [''],
    PreviousSchool: [''],
    // mother
    MotherOpenEMIS_ID: [''],
    MotherName: [''],
    MotherContact: [''],
    MotherFirstName: [''],
    MotherLastName: [''],
    MotherAddress: [''],
    MotherTelephone: [''],
    MotherEmail: [''],
    MotherDOB: [''],
    MotherIsDeceased: [''],
    MotherNationality: [''],
    // father
    FatherOpenEMIS_ID: [''],
    FatherName: [''],
    FatherContact: [''],
    FatherFirstName: [''],
    FatherLastName: [''],
    FatherAddress: [''],
    FatherTelephone: [''],
    FatherEmail: [''],
    FatherDOB: [''],
    FatherIsDeceased: [''],
    FatherNationality: [''],
    // guardian
    GuardianOpenEMIS_ID: [''],
    GuardianName: [''],
    GuardianGender: [''],
    GuardianDateOfBirth: [''],
    GuardianFirstName: [''],
    GuardianLastName: [''],
    GuardianAddress: [''],
    GuardianTelephone: [''],
    GuardianEmail: [''],
    GuardianDOB: [''],
    GuardianIsDeceased: [''],
    GuardianNationality: [''],
    // living
    Studentlivingwith: [''],
    StudentLivingWithGuardian: [''],
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
          return this.api.searchStudents(q, 1, 20);
        })
      )
      .subscribe({
        next: (res) => { const items = Array.isArray(res?.items) ? res.items.slice(0, 20) : []; this.results.set(items); this.searching.set(false); },
        error: () => { this.results.set([]); this.searching.set(false); }
      });
  }

  onSearch(ev: Event) {
    const val = (ev.target as HTMLInputElement).value.trim();
    this.search$.next(val);
  }

  formatDateForDisplay(dateValue: string | null | undefined): string {
    if (!dateValue) return '';

    // Handle ISO format (e.g., "2007-10-16T00:00:00.000Z")
    if (dateValue.includes('T')) {
      const [datePart] = dateValue.split('T');
      const [year, month, day] = datePart.split('-');
      return `${day}-${month}-${year}`;
    }

    // Handle YYYY-MM-DD format
    if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateValue.split('-');
      return `${day}-${month}-${year}`;
    }

    // If already in DD-MM-YYYY format or unknown format, return as is
    return dateValue;
  }

  select(s: StudentData) {
    this.results.set([]);
    // Clear the search box
    const searchInput = document.querySelector('input[placeholder="Type 3+ characters"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = '';
    }
    this.lastQuery = '';

    // Format dates for display (convert YYYY-MM-DD to DD-MM-YYYY)
    const formattedData = { ...s };
    const dateFields = ['DateOfBirth', 'StartDate', 'EndDate', 'MotherDOB', 'FatherDOB', 'GuardianDateOfBirth', 'GuardianDOB'];
    dateFields.forEach(field => {
      if (formattedData[field as keyof StudentData] && typeof formattedData[field as keyof StudentData] === 'string') {
        const dateValue = formattedData[field as keyof StudentData] as string;
        if (dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
          // Convert YYYY-MM-DD to DD-MM-YYYY
          const [year, month, day] = dateValue.split('T')[0].split('-');
          (formattedData as any)[field] = `${day}-${month}-${year}`;
        }
      }
    });

    this.form.reset({ ...formattedData });
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

    // Convert dates from DD-MM-YYYY format back to YYYY-MM-DD for database storage
    const dateFields = ['DateOfBirth', 'StartDate', 'EndDate', 'MotherDOB', 'FatherDOB', 'GuardianDateOfBirth', 'GuardianDOB'];
    dateFields.forEach(field => {
      if (payload[field as keyof StudentData] && typeof payload[field as keyof StudentData] === 'string') {
        const dateValue = payload[field as keyof StudentData] as string;
        if (dateValue.match(/^\d{2}-\d{2}-\d{4}$/)) {
          // Convert DD-MM-YYYY to YYYY-MM-DD
          const [day, month, year] = dateValue.split('-');
          (payload as any)[field] = `${year}-${month}-${day}`;
        }
      }
    });

    this.api.updateStudent(payload).subscribe({
      next: (res) => {
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
