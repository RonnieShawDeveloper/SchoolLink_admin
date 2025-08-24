import { Component, inject, signal, output, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AcademicUpdateData } from '../../../core/services/student-api.service';

@Component({
  selector: 'app-academic-update-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="dialog-backdrop" (click)="onCancel()">
      <div class="dialog-content" (click)="$event.stopPropagation()" [formGroup]="form">
        <div class="dialog-header">
          <h3>Update Academic Information</h3>
          <p>Please update the academic information for the current period:</p>
        </div>

        <div class="dialog-body">
          <div class="field-grid">
            <!-- Academic Period - SELECT DROPDOWN -->
            <div class="field">
              <label class="field-label">Academic Period</label>
              <select class="app-input" formControlName="AcademicPeriod">
                <option value="">Select Academic Period</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
                <option value="2027-2028">2027-2028</option>
                <option value="2028-2029">2028-2029</option>
                <option value="2029-2030">2029-2030</option>
              </select>
              <div class="field-hint">Select current academic year</div>
            </div>

            <!-- Education Grade - SELECT DROPDOWN -->
            <div class="field">
              <label class="field-label">Education Grade</label>
              <select class="app-input" formControlName="EducationGrade">
                <option value="">Select Grade</option>
                <option value="Grade 1">Grade 1</option>
                <option value="Grade 2">Grade 2</option>
                <option value="Grade 3">Grade 3</option>
                <option value="Grade 4">Grade 4</option>
                <option value="Grade 5">Grade 5</option>
                <option value="Grade 6">Grade 6</option>
                <option value="Grade 7">Grade 7</option>
                <option value="Grade 8">Grade 8</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12</option>
                <option value="Grade 13 Post Secondary">Grade 13 Post Secondary</option>
                <option value="Junior Prevocational 7">Junior Prevocational 7</option>
                <option value="Junior Prevocational 8">Junior Prevocational 8</option>
                <option value="Junior Prevocational 9">Junior Prevocational 9</option>
                <option value="Junior Special Level I">Junior Special Level I</option>
                <option value="Junior Special Teachable">Junior Special Teachable</option>
                <option value="Junior Special Teachable 2">Junior Special Teachable 2</option>
                <option value="Junior Special Trainable 1">Junior Special Trainable 1</option>
                <option value="Pre School Special I">Pre School Special I</option>
                <option value="Pre School Special II">Pre School Special II</option>
                <option value="Pre School Special Trainable">Pre School Special Trainable</option>
                <option value="Preschool L1">Preschool L1</option>
                <option value="Preschool L1 SP">Preschool L1 SP</option>
                <option value="Preschool L2">Preschool L2</option>
                <option value="Preschool L2 SP">Preschool L2 SP</option>
                <option value="Primary - Prevocational">Primary - Prevocational</option>
                <option value="Primary I">Primary I</option>
                <option value="Primary II">Primary II</option>
                <option value="Primary Special Teachable">Primary Special Teachable</option>
                <option value="Primary Special Teachable 1">Primary Special Teachable 1</option>
                <option value="Primary Special Teachable 2">Primary Special Teachable 2</option>
                <option value="Primary Special Trainable 1">Primary Special Trainable 1</option>
                <option value="Reception I">Reception I</option>
                <option value="Reception II">Reception II</option>
                <option value="Senior Prevocational 10">Senior Prevocational 10</option>
                <option value="Senior Prevocational 11">Senior Prevocational 11</option>
                <option value="Senior Prevocational 12">Senior Prevocational 12</option>
                <option value="Senior Special Teachable">Senior Special Teachable</option>
                <option value="Senior Special Trainable">Senior Special Trainable</option>
                <option value="Other Grade">Other Grade</option>
              </select>
              <div class="field-hint">Select the student's current grade level</div>
            </div>

            <!-- Start Date - DATE INPUT FIELD -->
            <div class="field">
              <label class="field-label">Start Date</label>
              <input
                type="date"
                class="app-input"
                formControlName="StartDate" />
              <div class="field-hint">Academic year start date</div>
            </div>

            <!-- End Date - DATE INPUT FIELD -->
            <div class="field">
              <label class="field-label">End Date</label>
              <input
                type="date"
                class="app-input"
                formControlName="EndDate" />
              <div class="field-hint">Academic year end date</div>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn-secondary" (click)="onCancel()">Cancel</button>
          <button type="button" class="btn-primary" (click)="onConfirm()" [disabled]="form.invalid">Update</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .dialog-content { background: white; border-radius: 12px; padding: 24px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; }
    .dialog-header h3 { margin: 0 0 8px 0; color: #0B4F6C; }
    .dialog-header p { margin: 0 0 16px 0; color: var(--bah-text-muted); }
    .dialog-body { margin: 16px 0; }
    .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 600px) { .field-grid { grid-template-columns: 1fr; } }
    .field { display: flex; flex-direction: column; }
    .field-label { font-size: 0.85rem; font-weight: 600; color: var(--bah-text-muted); margin-bottom: 4px; }
    .field-hint { font-size: 0.75rem; color: var(--bah-text-muted); margin-top: 4px; }
    .app-input { padding: 10px 12px; border: 1px solid var(--bah-border); border-radius: 6px; }
    .dialog-footer { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; }
    .btn-primary, .btn-secondary { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; }
    .btn-primary { background: var(--bah-primary); color: white; }
    .btn-secondary { background: #6c757d; color: white; }
    .btn-primary:disabled { background: #adb5bd; cursor: not-allowed; }
  `]
})
export class AcademicUpdateDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  confirmed = output<AcademicUpdateData>();
  cancelled = output<void>();
  currentData = input<AcademicUpdateData | null>(null); // New input for current values

  form = this.fb.group({
    AcademicPeriod: ['2025-2026', Validators.required], // Default to 2025-2026
    EducationGrade: ['', Validators.required],
    StartDate: ['2025-09-01', Validators.required], // Default to 01-09-2025
    EndDate: ['2026-06-01', Validators.required]     // Default to 01-06-2026
  });

  ngOnInit() {
    // Pre-populate form with current data if provided
    const current = this.currentData();
    if (current) {
      // Convert DD-MM-YYYY back to YYYY-MM-DD for date inputs
      const startDate = this.convertToInputFormat(current.StartDate);
      const endDate = this.convertToInputFormat(current.EndDate);

      this.form.patchValue({
        AcademicPeriod: current.AcademicPeriod || '2025-2026',
        EducationGrade: current.EducationGrade || '',
        StartDate: startDate || '2025-09-01',
        EndDate: endDate || '2026-06-01'
      });
    }
  }

  onConfirm() {
    if (this.form.valid) {
      const formData = this.form.value as AcademicUpdateData;
      // Convert dates from YYYY-MM-DD (HTML5 date input format) to DD-MM-YYYY
      const convertedData = {
        ...formData,
        StartDate: this.convertToDisplayFormat(formData.StartDate),
        EndDate: this.convertToDisplayFormat(formData.EndDate)
      };
      this.confirmed.emit(convertedData);
    }
  }

  onCancel() {
    this.cancelled.emit();
  }

  private convertToDisplayFormat(dateValue: string): string {
    if (!dateValue || !dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) return dateValue;
    const [year, month, day] = dateValue.split('-');
    return `${day}-${month}-${year}`;
  }

  private convertToInputFormat(displayDate: string): string {
    if (!displayDate || !displayDate.match(/^\d{2}-\d{2}-\d{4}$/)) return displayDate;
    const [day, month, year] = displayDate.split('-');
    return `${year}-${month}-${day}`;
  }
}
