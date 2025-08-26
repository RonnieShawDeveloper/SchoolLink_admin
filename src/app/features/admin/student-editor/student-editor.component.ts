import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { StudentApiService, SearchResponse, SchoolOption, AcademicUpdateData } from '../../../core/services/student-api.service';
import { StudentData } from '../../../core/models/student-data';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Subject, of } from 'rxjs';
import { AcademicUpdateDialogComponent } from '../../../shared/components/academic-update-dialog/academic-update-dialog.component';
import { WebcamCaptureComponent, PhotoCaptureResult } from '../../../shared/components/webcam-capture/webcam-capture.component';
import { StudentPhotoService } from '../../../core/services/student-photo.service';

@Component({
  selector: 'app-admin-student-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AcademicUpdateDialogComponent, WebcamCaptureComponent],
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
     .btn-secondary { background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: background-color 0.15s ease; }
     .btn-secondary:hover { background: #545b62; }
     .btn-secondary:disabled { background: #adb5bd; cursor: not-allowed; }

     /* Photo Section Styles */
     .student-info-container { display: flex; gap: 20px; }
     @media (max-width: 900px) { .student-info-container { flex-direction: column; } }
     .photo-section { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
     .photo-container { width: 120px; height: 120px; border: 2px solid #0B4F6C; border-radius: 50%; overflow: hidden; background: #f8f9fa; display: flex; align-items: center; justify-content: center; }
     .student-photo { width: 100%; height: 100%; object-fit: cover; }
     .no-photo-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #6c757d; text-align: center; }
     .no-photo-icon { font-size: 40px; margin-bottom: 4px; }
     .no-photo-text { font-size: 12px; font-weight: 600; }
     .btn-take-photo { background: #0B4F6C; color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-weight: 500; font-size: 12px; transition: all 0.15s ease; white-space: nowrap; }
     .btn-take-photo:hover { background: #094260; }
     .btn-take-photo:disabled { background: #adb5bd; cursor: not-allowed; }
     .field-grid { flex: 1; min-width: 0; }
    `
  ],
  template: `
    <div class="route-enter editor-root">
      <!-- Search (full width) -->
      <div class="app-card search-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <h3 style="margin: 0;">Find Student</h3>
          <div style="text-align: right;">
            <div style="font-size: 0.75rem; color: var(--bah-text-muted); margin-bottom: 2px;">Total Records</div>
            <div style="font-size: 1.25rem; font-weight: 700; color: var(--bah-primary);">
              {{ totalRecords().toLocaleString() }}
            </div>
          </div>
        </div>
        <div style="font-size:0.85rem; color: var(--bah-text-muted); margin-bottom:6px;">Student,
          Parent, Guardian or Student ID
        </div>
        <input type="text" class="app-input" placeholder="Type 3+ characters"
               (input)="onSearch($event)"/>
        <div *ngIf="searching()" style="margin-top:8px; color: var(--bah-text-muted);">Searching…
        </div>
        <div *ngIf="results().length"
             style="margin-top:8px; max-height:240px; overflow:auto; border-top:1px solid var(--bah-border);">
          <div *ngFor="let s of results()" (click)="select(s)"
               style="padding:8px; border-bottom:1px solid var(--bah-border); cursor:pointer; display:flex; justify-content:space-between;">
            <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              <div style="font-weight:600;">{{ s.StudentName || '—' }}</div>
              <div style="font-size:0.85rem; color: var(--bah-text-muted);">
                DOB: {{ formatDateForDisplay(s.DateOfBirth) || '—' }}
              </div>
            </div>
            <div
              style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">{{ s.StudentOpenEMIS_ID }}
            </div>
          </div>
        </div>
        <div *ngIf="!results().length && lastQuery && !searching()"
             style="margin-top:8px; color: var(--bah-text-muted);">No matches.
        </div>
        <div style="margin-top:12px; display:flex; gap:8px;">
          <button class="btn-primary" (click)="newStudent()">New Student</button>
          <button class="btn-primary" [disabled]="!formEnabled()" (click)="save()">Save</button>
        </div>
      </div>

      <!-- Editor Form Sections -->
      <div class="form-sections" [formGroup]="form">
        <!-- Student Personal Information -->
        <section class="fieldset-card">
          <h3 class="section-title">Student Personal Information</h3>
          <div class="student-info-container">
            <!-- Photo Section -->
            <div class="photo-section">
              <div class="photo-container">
                <img
                  *ngIf="studentPhotoUrl(); else noPhotoTemplate"
                  [src]="studentPhotoUrl()"
                  alt="Student Photo"
                  class="student-photo"
                  (error)="onPhotoError()" />
                <ng-template #noPhotoTemplate>
                  <div class="no-photo-placeholder">
                    <div class="no-photo-icon">👤</div>
                    <div class="no-photo-text">No Photo</div>
                  </div>
                </ng-template>
              </div>
              <button
                type="button"
                class="btn-take-photo"
                (click)="openPhotoCapture()"
                [disabled]="!formEnabled() || loadingPhoto()">
                <span *ngIf="loadingPhoto()">Loading...</span>
                <span *ngIf="!loadingPhoto()">📸 Take Photo</span>
              </button>
            </div>
            <!-- Form Fields - First 4 fields next to photo -->
            <div class="field-grid">
            <div class="field"><label class="field-label">SchoolLink ID</label><input
              class="app-input" formControlName="StudentID" type="number" [disabled]="true"/></div>
            <div class="field"><label class="field-label">Student OpenEMIS ID</label><input
              class="app-input" formControlName="StudentOpenEMIS_ID" [disabled]="true"/></div>
            <div class="field"><label class="field-label">Student Name</label><input
              class="app-input" formControlName="StudentName"/></div>
            <div class="field"><label class="field-label">Student Status</label><input
              class="app-input" formControlName="StudentStatus"/></div>
            </div>
          </div>

          <!-- Additional fields below photo at full width -->
          <div class="field-grid" style="margin-top: 16px;">
            <div class="field"><label class="field-label">Gender</label><input class="app-input"
                                                                               formControlName="Gender"/>
            </div>
            <div class="field"><label class="field-label">Date Of Birth (DD-MM-YYYY)</label><input
              class="app-input" formControlName="DateOfBirth" placeholder="DD-MM-YYYY" [disabled]="true"/></div>
            <div class="field"><label class="field-label">Age</label><input class="app-input"
                                                                            formControlName="Age"
                                                                            type="number" [disabled]="true"/></div>
            <div class="field"><label class="field-label">Preferred Nationality</label><input
              class="app-input" formControlName="PreferredNationality"/></div>
            <div class="field"><label class="field-label">All Nationalities</label><input
              class="app-input" formControlName="AllNationalities"/></div>
            <div class="field"><label class="field-label">Default Identity Type</label><input
              class="app-input" formControlName="DefaultIdentitytype"/></div>
            <div class="field"><label class="field-label">Identity Number</label><input
              class="app-input" formControlName="IdentityNumber"/></div>
            <div class="field"><label class="field-label">Risk Index</label><input class="app-input"
                                                                                   formControlName="RiskIndex"/>
            </div>
            <div class="field" style="grid-column:1 / -1;"><label
              class="field-label">Address</label><input class="app-input"
                                                        formControlName="Address"/></div>
            <div class="field"><label class="field-label">NIB2</label><input class="app-input"
                                                                             formControlName="NIB2"/>
            </div>
            <div class="field" style="grid-column:1 / -1;"><label class="field-label">Extra
              Activities</label><textarea class="app-input" formControlName="ExtraActivities"
                                          rows="2"></textarea></div>
          </div>
        </section>

        <!-- Institution & Location -->
        <section class="fieldset-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h3 class="section-title" style="margin: 0;">Institution & Location</h3>
            <button
              *ngIf="formEnabled() && !showSchoolSelector()"
              type="button"
              class="btn-secondary"
              (click)="enableSchoolChange()"
              style="padding: 6px 12px; font-size: 0.85rem;">
              Change School
            </button>
            <div *ngIf="showSchoolSelector()" style="display: flex; gap: 8px;">
              <button type="button" class="btn-secondary" (click)="cancelSchoolChange()" style="padding: 4px 8px; font-size: 0.8rem;">Cancel</button>
            </div>
          </div>
          <div class="field-grid">
            <!-- Institution Code - conditional input/select -->
            <div class="field">
              <label class="field-label">Institution Code</label>
              <input
                *ngIf="!showSchoolSelector()"
                class="app-input"
                formControlName="InstitutionCode"
                [disabled]="true" />
              <select
                *ngIf="showSchoolSelector()"
                class="app-input"
                formControlName="InstitutionCode"
                (change)="onSchoolSelected($event)">
                <option value="">Select a school...</option>
                <option
                  *ngFor="let school of schoolsList()"
                  [value]="school.InstitutionCode">
                  {{ school.InstitutionCode }} - {{ school.InstitutionName }}
                </option>
              </select>
              <div *ngIf="showSchoolSelector() && loadingSchools()" style="font-size: 0.8rem; color: var(--bah-text-muted); margin-top: 4px;">
                Loading schools...
              </div>
            </div>

            <!-- Rest of Institution & Location fields remain the same -->
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
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h3 class="section-title" style="margin: 0;">Academic</h3>
            <button
              *ngIf="formEnabled()"
              type="button"
              class="btn-secondary"
              (click)="openAcademicUpdateDialog()"
              style="padding: 6px 12px; font-size: 0.85rem;">
              Update
            </button>
          </div>
          <div class="field-grid">
            <div class="field"><label class="field-label">Education Grade</label><input
              class="app-input" formControlName="EducationGrade" [disabled]="true"/></div>
            <div class="field"><label class="field-label">Academic Period</label><input
              class="app-input" formControlName="AcademicPeriod" [disabled]="true"/></div>
            <div class="field"><label class="field-label">Start Date (DD-MM-YYYY)</label><input
              class="app-input" formControlName="StartDate" placeholder="DD-MM-YYYY" [disabled]="true"/></div>
            <div class="field"><label class="field-label">End Date (DD-MM-YYYY)</label><input
              class="app-input" formControlName="EndDate" placeholder="DD-MM-YYYY" [disabled]="true"/></div>
            <div class="field"><label class="field-label">Class Name</label><input class="app-input"
                                                                                   formControlName="ClassName"/>
            </div>
            <div class="field"><label class="field-label">Last Grade Level Enrolled</label><input
              class="app-input" formControlName="LastGradeLevelEnrolled"/></div>
            <div class="field" style="grid-column:1 / -1;"><label class="field-label">Previous
              School</label><input class="app-input" formControlName="PreviousSchool"/></div>
          </div>
        </section>

        <!-- Mother -->
        <section class="fieldset-card">
          <h3 class="section-title">Mother</h3>
          <div class="field-grid">
            <div class="field"><label class="field-label">Mother OpenEMIS ID</label><input
              class="app-input" formControlName="MotherOpenEMIS_ID"/></div>
            <div class="field"><label class="field-label">Mother Name</label><input
              class="app-input" formControlName="MotherName"/></div>
            <div class="field"><label class="field-label">Mother Contact</label><input
              class="app-input" formControlName="MotherContact"/></div>
            <div class="field"><label class="field-label">Mother First Name</label><input
              class="app-input" formControlName="MotherFirstName"/></div>
            <div class="field"><label class="field-label">Mother Last Name</label><input
              class="app-input" formControlName="MotherLastName"/></div>
            <div class="field"><label class="field-label">Mother Address</label><input
              class="app-input" formControlName="MotherAddress"/></div>
            <div class="field"><label class="field-label">Mother Telephone</label><input
              class="app-input" formControlName="MotherTelephone"/></div>
            <div class="field"><label class="field-label">Mother Email</label><input
              class="app-input" formControlName="MotherEmail"/></div>
            <div class="field"><label class="field-label">Mother DOB (DD-MM-YYYY)</label><input
              class="app-input" formControlName="MotherDOB" placeholder="DD-MM-YYYY"/></div>
            <div class="field"><label class="field-label">Mother Is Deceased</label><input
              class="app-input" formControlName="MotherIsDeceased"/></div>
            <div class="field"><label class="field-label">Mother Nationality</label><input
              class="app-input" formControlName="MotherNationality"/></div>
          </div>
        </section>

        <!-- Father -->
        <section class="fieldset-card">
          <h3 class="section-title">Father</h3>
          <div class="field-grid">
            <div class="field"><label class="field-label">Father OpenEMIS ID</label><input
              class="app-input" formControlName="FatherOpenEMIS_ID"/></div>
            <div class="field"><label class="field-label">Father Name</label><input
              class="app-input" formControlName="FatherName"/></div>
            <div class="field"><label class="field-label">Father Contact</label><input
              class="app-input" formControlName="FatherContact"/></div>
            <div class="field"><label class="field-label">Father First Name</label><input
              class="app-input" formControlName="FatherFirstName"/></div>
            <div class="field"><label class="field-label">Father Last Name</label><input
              class="app-input" formControlName="FatherLastName"/></div>
            <div class="field"><label class="field-label">Father Address</label><input
              class="app-input" formControlName="FatherAddress"/></div>
            <div class="field"><label class="field-label">Father Telephone</label><input
              class="app-input" formControlName="FatherTelephone"/></div>
            <div class="field"><label class="field-label">Father Email</label><input
              class="app-input" formControlName="FatherEmail"/></div>
            <div class="field"><label class="field-label">Father DOB (DD-MM-YYYY)</label><input
              class="app-input" formControlName="FatherDOB" placeholder="DD-MM-YYYY"/></div>
            <div class="field"><label class="field-label">Father Is Deceased</label><input
              class="app-input" formControlName="FatherIsDeceased"/></div>
            <div class="field"><label class="field-label">Father Nationality</label><input
              class="app-input" formControlName="FatherNationality"/></div>
          </div>
        </section>

        <!-- Guardian -->
        <section class="fieldset-card">
          <h3 class="section-title">Guardian</h3>
          <div class="field-grid">
            <div class="field"><label class="field-label">Guardian OpenEMIS ID</label><input
              class="app-input" formControlName="GuardianOpenEMIS_ID"/></div>
            <div class="field"><label class="field-label">Guardian Name</label><input
              class="app-input" formControlName="GuardianName"/></div>
            <div class="field"><label class="field-label">Guardian Gender</label><input
              class="app-input" formControlName="GuardianGender"/></div>
            <div class="field"><label class="field-label">Guardian Date Of Birth
              (DD-MM-YYYY)</label><input class="app-input" formControlName="GuardianDateOfBirth"
                                         placeholder="DD-MM-YYYY"/></div>
            <div class="field"><label class="field-label">Guardian First Name</label><input
              class="app-input" formControlName="GuardianFirstName"/></div>
            <div class="field"><label class="field-label">Guardian Last Name</label><input
              class="app-input" formControlName="GuardianLastName"/></div>
            <div class="field"><label class="field-label">Guardian Address</label><input
              class="app-input" formControlName="GuardianAddress"/></div>
            <div class="field"><label class="field-label">Guardian Telephone</label><input
              class="app-input" formControlName="GuardianTelephone"/></div>
            <div class="field"><label class="field-label">Guardian Email</label><input
              class="app-input" formControlName="GuardianEmail"/></div>
            <div class="field"><label class="field-label">Guardian DOB (DD-MM-YYYY)</label><input
              class="app-input" formControlName="GuardianDOB" placeholder="DD-MM-YYYY"/></div>
            <div class="field"><label class="field-label">Guardian Is Deceased</label><input
              class="app-input" formControlName="GuardianIsDeceased"/></div>
            <div class="field"><label class="field-label">Guardian Nationality</label><input
              class="app-input" formControlName="GuardianNationality"/></div>
          </div>
        </section>

        <!-- Living Situation -->
        <section class="fieldset-card">
          <h3 class="section-title">Living Situation</h3>
          <div class="field-grid">
            <div class="field"><label class="field-label">Student Living With</label><input
              class="app-input" formControlName="Studentlivingwith"/></div>
            <div class="field"><label class="field-label">Student Living With Guardian</label><input
              class="app-input" formControlName="StudentLivingWithGuardian"/></div>
          </div>
        </section>
      </div>

      <!-- Webcam Capture Modal -->
      <app-webcam-capture
        *ngIf="showWebcam()"
        [studentOpenEmisId]="form.get('StudentOpenEMIS_ID')?.value || ''"
        (photoUploaded)="onPhotoUploaded($event)"
        (closed)="closePhotoCapture()">
      </app-webcam-capture>

      <app-academic-update-dialog
        *ngIf="showAcademicDialog()"
        [currentData]="getCurrentAcademicData()"
        (confirmed)="onAcademicUpdateConfirmed($event)"
        (cancelled)="onAcademicUpdateCancelled()">
      </app-academic-update-dialog>
    </div>
  `
})
export class AdminStudentEditorComponent implements OnInit {
  private readonly api = inject(StudentApiService);
  private readonly fb = inject(FormBuilder);
  private readonly photoService = inject(StudentPhotoService);

  form: FormGroup = this.fb.group({
    // basics
    StudentID: [{value: null, disabled: true}],
    StudentOpenEMIS_ID: [{value: '', disabled: true}],
    StudentName: [''],
    StudentStatus: [''],
    Gender: [''],
    DateOfBirth: [{value: '', disabled: true}],
    Age: [{value: null, disabled: true}],
    PreferredNationality: [''],
    AllNationalities: [''],
    DefaultIdentityType: [{value: '', disabled: true}],
    IdentityNumber: [''],
    RiskIndex: [''],
    Address: [''],
    NIB2: [''],
    ExtraActivities: [''],
    // institution & location
    InstitutionCode: [{value: '', disabled: true}],
    InstitutionName: [{value: '', disabled: true}],
    Ownewship: [{value: '', disabled: true}],
    Type: [{value: '', disabled: true}],
    Sector: [{value: '', disabled: true}],
    Provider: [{value: '', disabled: true}],
    Locality: [{value: '', disabled: true}],
    AreaEducationCode: [{value: '', disabled: true}],
    AreaEducation: [{value: '', disabled: true}],
    AreaAdministrativeCode: [{value: '', disabled: true}],
    AreaAdministrative: [{value: '', disabled: true}],
    // academic
    EducationGrade: [{value: '', disabled: true}],
    AcademicPeriod: [{value: '', disabled: true}],
    StartDate: [{value: '', disabled: true}],
    EndDate: [{value: '', disabled: true}],
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
  totalRecords = signal<number>(0);
  schoolsList = signal<SchoolOption[]>([]);
  showSchoolSelector = signal<boolean>(false);
  showAcademicDialog = signal<boolean>(false);
  loadingSchools = signal<boolean>(false);
  pendingSchoolData: SchoolOption | null = null;
  lastQuery = '';

  // Photo-related signals
  studentPhotoUrl = signal<string>('');
  loadingPhoto = signal<boolean>(false);
  showWebcam = signal<boolean>(false);

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

  ngOnInit() {
    this.loadTotalStudentCount();
    this.loadSchoolsList(); // Preload schools list
  }

  private loadTotalStudentCount() {
    this.api.getStudentCount().subscribe({
      next: (response) => {
        this.totalRecords.set(response.totalRecords);
      },
      error: (error) => {
        console.error('Failed to load student count:', error);
        this.totalRecords.set(0);
      }
    });
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

  enableSchoolChange() {
    if (this.schoolsList().length === 0) {
      this.loadSchoolsList();
    }
    this.showSchoolSelector.set(true);
    // Enable the InstitutionCode control temporarily
    this.form.get('InstitutionCode')?.enable();
  }

  cancelSchoolChange() {
    this.showSchoolSelector.set(false);
    // Re-disable the InstitutionCode control
    this.form.get('InstitutionCode')?.disable();
    this.pendingSchoolData = null;
  }

  onSchoolSelected(event: Event) {
    const selectedCode = (event.target as HTMLSelectElement).value;
    if (!selectedCode) return;

    const selectedSchool = this.schoolsList().find(school => school.InstitutionCode === selectedCode);
    if (!selectedSchool) return;

    // Store the selected school data for later use
    this.pendingSchoolData = selectedSchool;

    // Hide selector and show academic update dialog
    this.showSchoolSelector.set(false);
    this.showAcademicDialog.set(true);
  }

  onAcademicUpdateConfirmed(academicData: AcademicUpdateData) {
    // Check if this is a school change or standalone academic update
    if (this.pendingSchoolData) {
      // Handle school change scenario (existing logic)
      const schoolFields = {
        InstitutionCode: this.pendingSchoolData.InstitutionCode,
        InstitutionName: this.pendingSchoolData.InstitutionName,
        Ownewship: this.pendingSchoolData.Ownewship,
        Type: this.pendingSchoolData.Type,
        Sector: this.pendingSchoolData.Sector,
        Provider: this.pendingSchoolData.Provider,
        Locality: this.pendingSchoolData.Locality,
        AreaEducationCode: this.pendingSchoolData.AreaEducationCode,
        AreaEducation: this.pendingSchoolData.AreaEducation,
        AreaAdministrativeCode: this.pendingSchoolData.AreaAdministrativeCode,
        AreaAdministrative: this.pendingSchoolData.AreaAdministrative,
        // Academic fields from dialog (already converted to DD-MM-YYYY format)
        EducationGrade: academicData.EducationGrade,
        AcademicPeriod: academicData.AcademicPeriod,
        StartDate: academicData.StartDate,
        EndDate: academicData.EndDate
      };
      this.form.patchValue(schoolFields);
      this.form.get('InstitutionCode')?.disable();
      this.pendingSchoolData = null;
    } else {
      // Handle standalone academic update
      // Temporarily enable academic fields to update them
      this.form.get('EducationGrade')?.enable();
      this.form.get('AcademicPeriod')?.enable();
      this.form.get('StartDate')?.enable();
      this.form.get('EndDate')?.enable();

      // Update only academic fields
      this.form.patchValue({
        EducationGrade: academicData.EducationGrade,
        AcademicPeriod: academicData.AcademicPeriod,
        StartDate: academicData.StartDate,
        EndDate: academicData.EndDate
      });

      // Re-disable academic fields
      this.form.get('EducationGrade')?.disable();
      this.form.get('AcademicPeriod')?.disable();
      this.form.get('StartDate')?.disable();
      this.form.get('EndDate')?.disable();
    }

    // Clean up
    this.showAcademicDialog.set(false);
  }

  onAcademicUpdateCancelled() {
    this.showAcademicDialog.set(false);
    this.pendingSchoolData = null;
    // Re-disable the InstitutionCode control
    this.form.get('InstitutionCode')?.disable();
  }

  openAcademicUpdateDialog() {
    // Pre-populate dialog with current academic values
    this.showAcademicDialog.set(true);
  }

  getCurrentAcademicData(): AcademicUpdateData | null {
    if (!this.formEnabled()) return null;

    return {
      EducationGrade: this.form.get('EducationGrade')?.value || '',
      AcademicPeriod: this.form.get('AcademicPeriod')?.value || '',
      StartDate: this.form.get('StartDate')?.value || '',
      EndDate: this.form.get('EndDate')?.value || ''
    };
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

  private calculateAge(birthDate: string): number | null {
    if (!birthDate) return null;

    let parsedDate: Date;

    // Handle DD-MM-YYYY format
    if (birthDate.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const [day, month, year] = birthDate.split('-');
      parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    // Handle YYYY-MM-DD format
    else if (birthDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      parsedDate = new Date(birthDate);
    }
    // Handle ISO format
    else if (birthDate.includes('T')) {
      parsedDate = new Date(birthDate);
    }
    else {
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - parsedDate.getFullYear();
    const monthDiff = today.getMonth() - parsedDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsedDate.getDate())) {
      age--;
    }

    return age >= 0 ? age : null;
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

    // Calculate age from date of birth
    if (formattedData.DateOfBirth) {
      const calculatedAge = this.calculateAge(formattedData.DateOfBirth.toString());
      formattedData.Age = calculatedAge ?? undefined;
    }

    this.form.reset({ ...formattedData });
    this.formEnabled.set(true);

    // Load student photo
    this.loadStudentPhoto();
  }

  newStudent() {
    this.results.set([]);
    this.form.reset({ StudentID: null });
    this.formEnabled.set(true);

    // Clear photo for new student
    this.studentPhotoUrl.set('');
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
          // Refresh count after new student is added
          this.loadTotalStudentCount();
        }
        alert('Saved successfully.');
      },
      error: (err) => {
        console.error(err);
        alert('Save failed: ' + (err?.message || 'Unknown error'));
      }
    });
  }

  // Photo-related methods
  private loadStudentPhoto() {
    const studentOpenEmisId = this.form.get('StudentOpenEMIS_ID')?.value;
    if (!studentOpenEmisId) {
      this.studentPhotoUrl.set('');
      return;
    }

    this.loadingPhoto.set(true);
    this.photoService.getStudentPhotoUrl(studentOpenEmisId).subscribe({
      next: (result) => {
        this.loadingPhoto.set(false);
        if (result.success && result.photoUrl) {
          this.studentPhotoUrl.set(result.photoUrl);
        } else {
          this.studentPhotoUrl.set('');
        }
      },
      error: (err) => {
        this.loadingPhoto.set(false);
        console.warn('Failed to load student photo:', err);
        this.studentPhotoUrl.set('');
      }
    });
  }

  openPhotoCapture() {
    const studentOpenEmisId = this.form.get('StudentOpenEMIS_ID')?.value;
    if (!studentOpenEmisId) {
      alert('Student OpenEMIS ID is required to take a photo');
      return;
    }
    this.showWebcam.set(true);
  }

  closePhotoCapture() {
    this.showWebcam.set(false);
  }

  onPhotoUploaded(result: PhotoCaptureResult) {
    if (result.success) {
      // Refresh the photo display
      this.loadStudentPhoto();
      alert('Photo uploaded successfully!');
    } else {
      alert('Failed to upload photo: ' + (result.error || 'Unknown error'));
    }
    this.closePhotoCapture();
  }

  onPhotoError() {
    // Handle photo loading error (e.g., image not found, network error)
    this.studentPhotoUrl.set('');
  }
}
