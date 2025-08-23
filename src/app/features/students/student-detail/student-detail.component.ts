import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StudentsService } from '../../../core/services/students.service';
import { StudentRecord } from '../../../core/models/student-data';
import { QrCodeComponent } from 'ng-qrcode';

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, QrCodeComponent],
  template: `
    <div class="route-enter" *ngIf="student as s; else notFound">
      <div class="app-card" style="padding:16px; display:flex; align-items:center; gap:16px;">
        <ng-container *ngIf="!photoError && s.photoUrl; else initialsTpl">
          <img [src]="s.photoUrl" (error)="photoError = true" alt="Photo"
               style="width:92px; height:92px; border-radius:12px; object-fit:cover; background:#EEF6F9; border:1px solid var(--bah-border);" />
        </ng-container>
        <ng-template #initialsTpl>
          <div [title]="s.StudentName" style="width:92px; height:92px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:1.2rem; color:#fff; background: var(--bah-primary); border:1px solid var(--bah-border);">
            {{ initials(s.StudentName) }}
          </div>
        </ng-template>
        <div style="flex:1;">
          <div style="font-weight:700; font-size:1.1rem;">{{ s.StudentName }}</div>
          <div class="chip">Grade {{ s.grade }}</div>
          <div class="chip" style="background:#FFF3CD; color:#6B5B00;">{{ s.school }}</div>
          <div style="font-size:0.9rem; color:var(--bah-text-muted);">SID: {{ s.StudentOpenEMIS_ID }}</div>
          <a routerLink="/students" style="font-size:0.85rem;">← Back to Students</a>
        </div>
        <qr-code [value]="qrValue" [size]="120" [errorCorrectionLevel]="'M'"></qr-code>
      </div>

      <div style="margin-top:16px; display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
        <!-- Institution Details -->
        <div class="app-card" style="padding:16px;">
          <h3 style="margin:0 0 8px 0;">Institution Details</h3>
          <div *ngFor="let f of instFields" style="padding:6px 0; border-top:1px solid var(--bah-border);">
            <strong>{{ f.label }}:</strong> {{ display(s[f.key]) }}
          </div>
        </div>

        <!-- Attendance -->
        <div class="app-card" style="padding:16px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <h3 style="margin:0;">Attendance Today</h3>
            <span class="chip" [ngStyle]="{ background: s.attendanceToday.status === 'On Campus' ? '#E7F8F0' : '#FDECEC', color: s.attendanceToday.status === 'On Campus' ? '#116149' : '#8A1C1C' }">
              {{ s.attendanceToday.status }}
            </span>
          </div>
          <div style="margin-top:8px;">
            <div><strong>Gate Check-In:</strong> {{ s.attendanceToday.gateCheckIn | date: 'shortTime' }}</div>
            <div style="margin-top:8px;"><strong>Class Check-ins:</strong></div>
            <ul style="margin:6px 0 0 18px; padding:0;">
              <li *ngFor="let c of s.attendanceToday.classCheckIns">{{ c.className }} — {{ c.time | date: 'shortTime' }}</li>
            </ul>
            <div style="margin-top:8px;" *ngIf="s.attendanceToday.gateCheckOut; else stillHere">
              <strong>Gate Check-Out:</strong> {{ s.attendanceToday.gateCheckOut | date: 'shortTime' }}
            </div>
            <ng-template #stillHere>
              <div style="margin-top:8px; color: var(--bah-text-muted);">Gate Check-Out: —</div>
            </ng-template>
          </div>
        </div>

        <!-- Student Personal Details -->
        <div class="app-card" style="padding:16px; grid-column: 1 / -1;">
          <h3 style="margin:0 0 8px 0;">Student Personal Details</h3>
          <div *ngFor="let f of personalFields" style="padding:6px 0; border-top:1px solid var(--bah-border);">
            <strong>{{ f.label }}:</strong> {{ display(s[f.key]) }}
          </div>
        </div>

        <!-- Parents & Contacts (Derived) -->
        <div class="app-card" style="padding:16px;">
          <h3 style="margin:0 0 8px 0;">Parents & Contacts</h3>
          <div *ngFor="let g of s.guardians" style="padding:8px 0; border-top:1px solid var(--bah-border);">
            <div style="font-weight:600;">{{ g.name }} <span class="chip" style="margin-left:6px;">{{ g.relation }}</span></div>
            <div style="font-size:0.9rem; color:var(--bah-text-muted);">Phone: {{ g.phone }} · Email: {{ g.email }}</div>
          </div>
        </div>

        <!-- Academic Details -->
        <div class="app-card" style="padding:16px;">
          <h3 style="margin:0 0 8px 0;">Academic Details</h3>
          <div *ngFor="let f of academicFields" style="padding:6px 0; border-top:1px solid var(--bah-border);">
            <strong>{{ f.label }}:</strong> {{ display(s[f.key]) }}
          </div>
        </div>

        <!-- Mother's Details -->
        <div class="app-card" style="padding:16px;">
          <h3 style="margin:0 0 8px 0;">Mother's Details</h3>
          <div *ngFor="let f of motherFields" style="padding:6px 0; border-top:1px solid var(--bah-border);">
            <strong>{{ f.label }}:</strong> {{ display(s[f.key]) }}
          </div>
        </div>

        <!-- Father's Details -->
        <div class="app-card" style="padding:16px;">
          <h3 style="margin:0 0 8px 0;">Father's Details</h3>
          <div *ngFor="let f of fatherFields" style="padding:6px 0; border-top:1px solid var(--bah-border);">
            <strong>{{ f.label }}:</strong> {{ display(s[f.key]) }}
          </div>
        </div>

        <!-- Guardian's Details -->
        <div class="app-card" style="padding:16px;">
          <h3 style="margin:0 0 8px 0;">Guardian's Details</h3>
          <div *ngFor="let f of guardianFields" style="padding:6px 0; border-top:1px solid var(--bah-border);">
            <strong>{{ f.label }}:</strong> {{ display(s[f.key]) }}
          </div>
        </div>

        <!-- Living Situation -->
        <div class="app-card" style="padding:16px;">
          <h3 style="margin:0 0 8px 0;">Living Situation</h3>
          <div *ngFor="let f of livingFields" style="padding:6px 0; border-top:1px solid var(--bah-border);">
            <strong>{{ f.label }}:</strong> {{ display(s[f.key]) }}
          </div>
        </div>
      </div>
    </div>
    <ng-template #notFound>
      <div class="app-card" style="padding:16px;">Student not found. <a routerLink="/students">Back to list</a></div>
    </ng-template>
  `
})
export class StudentDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(StudentsService);

  student: StudentRecord | undefined = this.svc.getById(this.route.snapshot.params['id']);
  photoError = false;

  // Section field descriptors
  readonly instFields: Array<{ label: string; key: keyof StudentRecord }> = [
    { label: 'Institution Code', key: 'InstitutionCode' },
    { label: 'Institution Name', key: 'InstitutionName' },
    { label: 'Ownership', key: 'Ownewship' },
    { label: 'Type', key: 'Type' },
    { label: 'Sector', key: 'Sector' },
    { label: 'Provider', key: 'Provider' },
    { label: 'Locality', key: 'Locality' },
    { label: 'Area Education Code', key: 'AreaEducationCode' },
    { label: 'Area Education', key: 'AreaEducation' },
    { label: 'Area Administrative Code', key: 'AreaAdministrativeCode' },
    { label: 'Area Administrative', key: 'AreaAdministrative' },
  ];

  readonly academicFields: Array<{ label: string; key: keyof StudentRecord }> = [
    { label: 'Education Grade', key: 'EducationGrade' },
    { label: 'Academic Period', key: 'AcademicPeriod' },
    { label: 'Start Date', key: 'StartDate' },
    { label: 'End Date', key: 'EndDate' },
    { label: 'Class Name', key: 'ClassName' },
    { label: 'Last Grade Level Enrolled', key: 'LastGradeLevelEnrolled' },
    { label: 'Previous School', key: 'PreviousSchool' },
  ];

  readonly personalFields: Array<{ label: string; key: keyof StudentRecord }> = [
    { label: 'Student OpenEMIS ID', key: 'StudentOpenEMIS_ID' },
    { label: 'Student Name', key: 'StudentName' },
    { label: 'Student Status', key: 'StudentStatus' },
    { label: 'Gender', key: 'Gender' },
    { label: 'Date Of Birth', key: 'DateOfBirth' },
    { label: 'Age', key: 'Age' },
    { label: 'Preferred Nationality', key: 'PreferredNationality' },
    { label: 'All Nationalities', key: 'AllNationalities' },
    { label: 'Default Identity Type', key: 'DefaultIdentitytype' },
    { label: 'Identity Number', key: 'IdentityNumber' },
    { label: 'Risk Index', key: 'RiskIndex' },
    { label: 'Extra Activities', key: 'ExtraActivities' },
    { label: 'Address', key: 'Address' },
    { label: 'NIB2', key: 'NIB2' },
  ];

  readonly motherFields: Array<{ label: string; key: keyof StudentRecord }> = [
    { label: 'Mother OpenEMIS ID', key: 'MotherOpenEMIS_ID' },
    { label: 'Mother Name', key: 'MotherName' },
    { label: 'Mother Contact', key: 'MotherContact' },
    { label: 'Mother First Name', key: 'MotherFirstName' },
    { label: 'Mother Last Name', key: 'MotherLastName' },
    { label: 'Mother Address', key: 'MotherAddress' },
    { label: 'Mother Telephone', key: 'MotherTelephone' },
    { label: 'Mother Email', key: 'MotherEmail' },
    { label: 'Mother DOB', key: 'MotherDOB' },
    { label: 'Mother Is Deceased', key: 'MotherIsDeceased' },
    { label: 'Mother Nationality', key: 'MotherNationality' },
  ];

  readonly fatherFields: Array<{ label: string; key: keyof StudentRecord }> = [
    { label: 'Father OpenEMIS ID', key: 'FatherOpenEMIS_ID' },
    { label: 'Father Name', key: 'FatherName' },
    { label: 'Father Contact', key: 'FatherContact' },
    { label: 'Father First Name', key: 'FatherFirstName' },
    { label: 'Father Last Name', key: 'FatherLastName' },
    { label: 'Father Address', key: 'FatherAddress' },
    { label: 'Father Telephone', key: 'FatherTelephone' },
    { label: 'Father Email', key: 'FatherEmail' },
    { label: 'Father DOB', key: 'FatherDOB' },
    { label: 'Father Is Deceased', key: 'FatherIsDeceased' },
    { label: 'Father Nationality', key: 'FatherNationality' },
  ];

  readonly guardianFields: Array<{ label: string; key: keyof StudentRecord }> = [
    { label: 'Guardian OpenEMIS ID', key: 'GuardianOpenEMIS_ID' },
    { label: 'Guardian Name', key: 'GuardianName' },
    { label: 'Guardian Gender', key: 'GuardianGender' },
    { label: 'Guardian Date Of Birth', key: 'GuardianDateOfBirth' },
    { label: 'Guardian First Name', key: 'GuardianFirstName' },
    { label: 'Guardian Last Name', key: 'GuardianLastName' },
    { label: 'Guardian Address', key: 'GuardianAddress' },
    { label: 'Guardian Telephone', key: 'GuardianTelephone' },
    { label: 'Guardian Email', key: 'GuardianEmail' },
    { label: 'Guardian DOB', key: 'GuardianDOB' },
    { label: 'Guardian Is Deceased', key: 'GuardianIsDeceased' },
    { label: 'Guardian Nationality', key: 'GuardianNationality' },
  ];

  readonly livingFields: Array<{ label: string; key: keyof StudentRecord }> = [
    { label: 'Student living with', key: 'Studentlivingwith' },
    { label: 'Student Living With Guardian', key: 'StudentLivingWithGuardian' },
  ];

  get qrValue(): string {
    return this.student ? JSON.stringify({ sid: this.student.StudentOpenEMIS_ID }) : '';
  }

  initials(name?: string): string {
    const parts = (name ?? '').trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts[parts.length - 1]?.[0] ?? '';
    return (first + last).toUpperCase();
  }

  display(v: unknown): string {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    try { return JSON.stringify(v); } catch { return String(v); }
  }
}
