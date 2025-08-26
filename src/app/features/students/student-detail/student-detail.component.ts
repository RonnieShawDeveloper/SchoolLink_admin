import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StudentApiService } from '../../../core/services/student-api.service';
import { StudentData } from '../../../core/models/student-data';
import { QrCodeComponent } from 'ng-qrcode';

interface ClassCheckin {
  className: string;
  time: Date;
}

interface SimulatedCheckins {
  gateIn: Date;
  classes: ClassCheckin[];
  gateOut: Date | null;
}

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, QrCodeComponent],
  template: `
    <!-- Loading State -->
    <div *ngIf="loading()" class="route-enter app-card" style="padding: 32px; text-align: center;">
      <div style="color: var(--bah-text-muted);">Loading student details...</div>
    </div>

    <!-- Error State -->
    <div *ngIf="error()" class="route-enter app-card" style="padding: 32px; text-align: center; color: var(--bah-text-muted);">
      <div style="font-size: 1.2rem; font-weight: 600;">{{ error() }}</div>
      <div style="margin-top: 8px;">Please try again or go back to the students list.</div>
      <a routerLink="/students" class="btn-primary" style="margin-top: 16px;">← Back to Students</a>
    </div>

    <!-- Student Details -->
    <div *ngIf="student() && !loading() && !error()" class="route-enter">
      <!-- Header Card -->
      <div class="app-card" style="padding: 16px; display: flex; align-items: center; gap: 16px;">
        <!-- Student Photo or Fallback -->
        <div style="width: 92px; height: 92px; border-radius: 12px; border: 1px solid var(--bah-border); overflow: hidden; position: relative;">
          <!-- Photo Loading State -->
          <div *ngIf="photoLoading()" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--bah-primary); color: #fff;">
            <div style="font-size: 0.8rem;">Loading...</div>
          </div>

          <!-- Photo Loaded Successfully -->
          <img *ngIf="photoUrl() && !photoLoading()"
               [src]="photoUrl()!"
               [alt]="student()!.StudentName + ' photo'"
               [title]="student()!.StudentName"
               style="width: 100%; height: 100%; object-fit: cover;">

          <!-- No Photo Available -->
          <div *ngIf="photoError() && !photoLoading()"
               [title]="student()!.StudentName"
               style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.7rem; color: var(--bah-text-muted); background: #f8f9fa; text-align: center; padding: 4px;">
            No Photo
          </div>

          <!-- Fallback to Initials (if no StudentOpenEMIS_ID) -->
          <div *ngIf="!student()!.StudentOpenEMIS_ID && !photoLoading()"
               [title]="student()!.StudentName"
               style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.2rem; color: #fff; background: var(--bah-primary);">
            {{ initials(student()!.StudentName || '') }}
          </div>
        </div>
        <div style="flex: 1;">
          <div style="font-weight: 700; font-size: 1.1rem;">{{ student()!.StudentName }}</div>
          <div class="chip">{{ student()!.EducationGrade || 'No Grade' }}</div>
          <div class="chip" style="background: #FFF3CD; color: #6B5B00;">{{ student()!.InstitutionName || 'No School' }}</div>
          <div style="font-size: 0.9rem; color: var(--bah-text-muted);">Student ID: {{ student()!.StudentOpenEMIS_ID }}</div>
          <a routerLink="/students" style="font-size: 0.85rem;">← Back to Students</a>
        </div>
        <qr-code [value]="qrValue()" [size]="120" [errorCorrectionLevel]="'M'"></qr-code>
      </div>

      <div style="margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <!-- Daily Check-ins Timeline -->
        <div class="app-card" style="padding: 16px; grid-column: 1 / -1;">
          <h3 style="margin: 0 0 16px 0;">Today's Check-in Timeline</h3>
          <div style="position: relative;">
            <!-- Timeline Line -->
            <div style="position: absolute; left: 20px; top: 0; bottom: 0; width: 2px; background: #e0e7ff;"></div>

            <!-- Gate In -->
            <div style="display: flex; align-items: center; margin-bottom: 16px; position: relative;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: #10b981; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; z-index: 1;">
                📥
              </div>
              <div style="margin-left: 16px;">
                <div style="font-weight: 600;">Gate Check-In</div>
                <div style="font-size: 0.9rem; color: var(--bah-text-muted);">{{ simulatedCheckins().gateIn | date: 'shortTime' }}</div>
              </div>
            </div>

            <!-- Class Check-ins -->
            <div *ngFor="let checkin of simulatedCheckins().classes" style="display: flex; align-items: center; margin-bottom: 16px; position: relative;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: #3b82f6; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; z-index: 1;">
                📚
              </div>
              <div style="margin-left: 16px;">
                <div style="font-weight: 600;">{{ checkin.className }}</div>
                <div style="font-size: 0.9rem; color: var(--bah-text-muted);">{{ checkin.time | date: 'shortTime' }}</div>
              </div>
            </div>

            <!-- Gate Out -->
            <div style="display: flex; align-items: center; position: relative;">
              <div [ngStyle]="getGateOutStyle()" style="width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; z-index: 1;">
                📤
              </div>
              <div style="margin-left: 16px;">
                <div style="font-weight: 600;">Gate Check-Out</div>
                <div style="font-size: 0.9rem; color: var(--bah-text-muted);">
                  {{ simulatedCheckins().gateOut ? (simulatedCheckins().gateOut | date: 'shortTime') : 'Still on campus' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Student Personal Information -->
        <div class="app-card" style="padding: 16px;">
          <h3 style="margin: 0 0 12px 0;">Student Personal Information</h3>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Full Name:</strong> {{ student()!.StudentName || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Gender:</strong> {{ student()!.Gender || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Date of Birth:</strong> {{ formatDateForDisplay(student()!.DateOfBirth) || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Age:</strong> {{ student()!.Age || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Nationality:</strong> {{ student()!.PreferredNationality || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Identity Number:</strong> {{ student()!.IdentityNumber || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Address:</strong> {{ student()!.Address || '—' }}
          </div>
        </div>

        <!-- Academic Information -->
        <div class="app-card" style="padding: 16px;">
          <h3 style="margin: 0 0 12px 0;">Academic Information</h3>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Education Grade:</strong> {{ student()!.EducationGrade || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Academic Period:</strong> {{ student()!.AcademicPeriod || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Class Name:</strong> {{ student()!.ClassName || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Start Date:</strong> {{ formatDateForDisplay(student()!.StartDate) || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>End Date:</strong> {{ formatDateForDisplay(student()!.EndDate) || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Previous School:</strong> {{ student()!.PreviousSchool || '—' }}
          </div>
        </div>

        <!-- Mother's Information -->
        <div class="app-card" style="padding: 16px;">
          <h3 style="margin: 0 0 12px 0;">Mother's Information</h3>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Name:</strong> {{ student()!.MotherName || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Contact:</strong> {{ student()!.MotherContact || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Email:</strong> {{ student()!.MotherEmail || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Telephone:</strong> {{ student()!.MotherTelephone || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Date of Birth:</strong> {{ formatDateForDisplay(student()!.MotherDOB) || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Address:</strong> {{ student()!.MotherAddress || '—' }}
          </div>
        </div>

        <!-- Father's Information -->
        <div class="app-card" style="padding: 16px;">
          <h3 style="margin: 0 0 12px 0;">Father's Information</h3>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Name:</strong> {{ student()!.FatherName || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Contact:</strong> {{ student()!.FatherContact || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Email:</strong> {{ student()!.FatherEmail || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Telephone:</strong> {{ student()!.FatherTelephone || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Date of Birth:</strong> {{ formatDateForDisplay(student()!.FatherDOB) || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Address:</strong> {{ student()!.FatherAddress || '—' }}
          </div>
        </div>

        <!-- Guardian's Information -->
        <div class="app-card" style="padding: 16px;">
          <h3 style="margin: 0 0 12px 0;">Guardian's Information</h3>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Name:</strong> {{ student()!.GuardianName || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Gender:</strong> {{ student()!.GuardianGender || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Contact:</strong> {{ student()!.GuardianTelephone || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Email:</strong> {{ student()!.GuardianEmail || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Date of Birth:</strong> {{ formatDateForDisplay(student()!.GuardianDateOfBirth) || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Address:</strong> {{ student()!.GuardianAddress || '—' }}
          </div>
        </div>

        <!-- Institution Details -->
        <div class="app-card" style="padding: 16px;">
          <h3 style="margin: 0 0 12px 0;">Institution Details</h3>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Institution Code:</strong> {{ student()!.InstitutionCode || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Institution Name:</strong> {{ student()!.InstitutionName || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Ownership:</strong> {{ student()!.Ownewship || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Type:</strong> {{ student()!.Type || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Sector:</strong> {{ student()!.Sector || '—' }}
          </div>
          <div style="padding: 6px 0; border-top: 1px solid var(--bah-border);">
            <strong>Locality:</strong> {{ student()!.Locality || '—' }}
          </div>
        </div>
      </div>
    </div>
  `
})
export class StudentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(StudentApiService);

  student = signal<StudentData | null>(null);
  loading = signal<boolean>(true);
  error = signal<string>('');

  // Photo-related properties
  photoUrl = signal<string | null>(null);
  photoLoading = signal<boolean>(false);
  photoError = signal<boolean>(false);

  ngOnInit() {
    const studentId = this.route.snapshot.params['id'];
    if (!studentId || isNaN(Number(studentId))) {
      this.error.set('Invalid student ID');
      this.loading.set(false);
      return;
    }

    this.api.getStudentById(Number(studentId)).subscribe({
      next: (response) => {
        this.student.set(response.student);
        this.loading.set(false);
        // Load student photo after student data is fetched
        this.loadStudentPhoto();
      },
      error: (err) => {
        console.error('Failed to load student:', err);
        this.error.set('Student not found');
        this.loading.set(false);
      }
    });
  }

  /**
   * Generates the S3 photo URL based on StudentOpenEMIS_ID
   */
  generatePhotoUrl(studentOpenEmisId: string): string {
    return `https://schoollink-student-photos.s3.us-east-1.amazonaws.com/student-photos/${studentOpenEmisId}.jpg`;
  }

  /**
   * Loads the student photo from S3 and handles errors gracefully
   */
  loadStudentPhoto(): void {
    const student = this.student();
    if (!student?.StudentOpenEMIS_ID) {
      this.photoError.set(true);
      return;
    }

    this.photoLoading.set(true);
    this.photoError.set(false);

    const photoUrl = this.generatePhotoUrl(student.StudentOpenEMIS_ID);

    // Create an image element to test if the photo exists
    const img = new Image();

    img.onload = () => {
      // Photo loaded successfully
      this.photoUrl.set(photoUrl);
      this.photoLoading.set(false);
      this.photoError.set(false);
    };

    img.onerror = () => {
      // Photo failed to load
      this.photoUrl.set(null);
      this.photoLoading.set(false);
      this.photoError.set(true);
    };

    // Start loading the image
    img.src = photoUrl;
  }

  qrValue(): string {
    const s = this.student();
    if (!s) return '';
    return `STUDENT:${s.StudentOpenEMIS_ID}:${s.StudentName}`;
  }

  initials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0] || '').join('').substring(0, 2).toUpperCase();
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

  getGateOutStyle(): any {
    const checkins = this.simulatedCheckins();
    return {
      background: checkins.gateOut ? '#ef4444' : '#9ca3af'
    };
  }

  simulatedCheckins(): SimulatedCheckins {
    const today = new Date();

    // Gate In: 7:45 AM
    const gateIn = new Date(today);
    gateIn.setHours(7, 45, 0, 0);

    // Class check-ins throughout the day
    const classes: ClassCheckin[] = [
      {
        className: 'Homeroom - Morning Assembly',
        time: new Date(today.setHours(8, 15, 0, 0))
      },
      {
        className: 'Mathematics',
        time: new Date(today.setHours(9, 30, 0, 0))
      },
      {
        className: 'English Language Arts',
        time: new Date(today.setHours(10, 45, 0, 0))
      },
      {
        className: 'Science',
        time: new Date(today.setHours(13, 15, 0, 0))
      },
      {
        className: 'Social Studies',
        time: new Date(today.setHours(14, 30, 0, 0))
      }
    ];

    // Gate Out: 3:30 PM (70% chance) or null (still on campus)
    const gateOut = Math.random() > 0.3 ? new Date(today.setHours(15, 30, 0, 0)) : null;

    return { gateIn, classes, gateOut };
  }
}
