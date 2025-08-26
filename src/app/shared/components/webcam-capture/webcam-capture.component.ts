import { Component, EventEmitter, Input, Output, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebcamImage, WebcamInitError, WebcamModule } from 'ngx-webcam';
import { Observable, Subject } from 'rxjs';
import { StudentPhotoService } from '../../../core/services/student-photo.service';

export interface PhotoCaptureResult {
  success: boolean;
  photoUrl?: string;
  error?: string;
}

@Component({
  selector: 'app-webcam-capture',
  standalone: true,
  imports: [CommonModule, WebcamModule],
  styles: [`
    :host { display: block; }
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-content {
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 600px;
      max-height: 90vh;
      overflow: auto;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    .modal-title {
      margin: 0;
      color: #0B4F6C;
      font-size: 1.5rem;
      font-weight: 700;
    }
    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color 0.15s ease;
    }
    .close-btn:hover {
      background-color: #f0f0f0;
    }
    .webcam-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .webcam-feed {
      border: 2px solid #0B4F6C;
      border-radius: 12px;
      overflow: hidden;
      max-width: 100%;
    }
    .preview-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .photo-preview {
      border: 2px solid #0B4F6C;
      border-radius: 12px;
      overflow: hidden;
      width: 300px;
      height: 300px;
      object-fit: cover;
    }
    .button-group {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      font-size: 14px;
    }
    .btn-primary {
      background: #0B4F6C;
      color: white;
    }
    .btn-primary:hover {
      background: #094260;
    }
    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    .btn-secondary:hover {
      background: #545b62;
    }
    .btn-danger {
      background: #dc3545;
      color: white;
    }
    .btn-danger:hover {
      background: #c82333;
    }
    .error-message {
      background: #f8d7da;
      color: #721c24;
      padding: 12px;
      border-radius: 8px;
      margin: 12px 0;
      border: 1px solid #f5c6cb;
    }
    .loading-message {
      text-align: center;
      color: #0B4F6C;
      font-style: italic;
      padding: 20px;
    }
    .status-message {
      text-align: center;
      padding: 12px;
      border-radius: 8px;
      margin: 12px 0;
    }
    .status-success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    .instructions {
      text-align: center;
      color: #666;
      font-size: 14px;
      margin-bottom: 16px;
      line-height: 1.4;
    }
  `],
  template: `
    <div class="modal-overlay" (click)="onOverlayClick($event)">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title">Take Student Photo</h3>
          <button class="close-btn" (click)="close()" type="button" aria-label="Close">×</button>
        </div>

        <!-- Error Messages -->
        <div *ngIf="error()" class="error-message">
          {{ error() }}
        </div>

        <!-- Webcam Initialization Error -->
        <div *ngIf="webcamError()" class="error-message">
          Camera Error: {{ webcamError() }}
          <br><small>Please check camera permissions and try again.</small>
        </div>

        <!-- Loading State -->
        <div *ngIf="uploading()" class="loading-message">
          Uploading photo...
        </div>

        <!-- Success Message -->
        <div *ngIf="uploadSuccess()" class="status-message status-success">
          Photo uploaded successfully!
        </div>

        <!-- Webcam Feed (when not captured) -->
        <div *ngIf="!capturedImage() && !uploading() && !uploadSuccess()" class="webcam-container">
          <div class="instructions">
            Position yourself in the camera and click "Capture Photo" when ready.<br>
            The photo will be automatically cropped to a square format.
          </div>

          <div class="webcam-feed">
            <webcam
              [height]="300"
              [width]="400"
              [trigger]="triggerObservable"
              (imageCapture)="handleImage($event)"
              (initError)="handleInitError($event)"
              [allowCameraSwitch]="true"
              [switchCamera]="nextWebcamObservable"
              [videoOptions]="videoOptions"
              [imageQuality]="0.8">
            </webcam>
          </div>

          <div class="button-group">
            <button class="btn btn-primary" (click)="capturePhoto()" type="button">
              📸 Capture Photo
            </button>
            <button class="btn btn-secondary" (click)="switchCamera()" type="button">
              🔄 Switch Camera
            </button>
            <button class="btn btn-secondary" (click)="close()" type="button">
              Cancel
            </button>
          </div>
        </div>

        <!-- Photo Preview (after capture) -->
        <div *ngIf="capturedImage() && !uploading() && !uploadSuccess()" class="preview-container">
          <div class="instructions">
            Review your photo. It will be saved as a square image.
          </div>

          <img [src]="capturedImage()" alt="Captured photo" class="photo-preview">

          <div class="button-group">
            <button class="btn btn-primary" (click)="uploadPhoto()" type="button" [disabled]="!studentOpenEmisId">
              💾 Save Photo
            </button>
            <button class="btn btn-danger" (click)="retakePhoto()" type="button">
              🔄 Retake
            </button>
            <button class="btn btn-secondary" (click)="close()" type="button">
              Cancel
            </button>
          </div>
        </div>

        <!-- Success State -->
        <div *ngIf="uploadSuccess() && !uploading()" class="preview-container">
          <div class="instructions">
            Photo has been successfully uploaded!
          </div>

          <div class="button-group">
            <button class="btn btn-primary" (click)="close()" type="button">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class WebcamCaptureComponent implements OnInit, OnDestroy {
  @Input() studentOpenEmisId: string = '';
  @Input() visible: boolean = false;
  @Output() photoUploaded = new EventEmitter<PhotoCaptureResult>();
  @Output() closed = new EventEmitter<void>();

  // Signals for reactive state management
  error = signal<string>('');
  webcamError = signal<string>('');
  capturedImage = signal<string>('');
  uploading = signal<boolean>(false);
  uploadSuccess = signal<boolean>(false);

  // Webcam triggers
  private trigger: Subject<void> = new Subject<void>();
  private nextWebcam: Subject<boolean> = new Subject<boolean>();

  // Webcam observables
  public triggerObservable: Observable<void> = this.trigger.asObservable();
  public nextWebcamObservable: Observable<boolean> = this.nextWebcam.asObservable();

  // Webcam video options
  public videoOptions: MediaTrackConstraints = {
    width: { ideal: 640 },
    height: { ideal: 480 }
  };

  constructor(private photoService: StudentPhotoService) {}

  ngOnInit() {
    // Reset state when component initializes
    this.resetState();
  }

  ngOnDestroy() {
    this.trigger.complete();
    this.nextWebcam.complete();
  }

  private resetState() {
    this.error.set('');
    this.webcamError.set('');
    this.capturedImage.set('');
    this.uploading.set(false);
    this.uploadSuccess.set(false);
  }

  capturePhoto() {
    this.error.set('');
    this.trigger.next();
  }

  switchCamera() {
    this.nextWebcam.next(true);
  }

  handleImage(webcamImage: WebcamImage) {
    try {
      // Store the captured image
      this.capturedImage.set(webcamImage.imageAsDataUrl);
      this.error.set('');
    } catch (err) {
      console.error('Error handling captured image:', err);
      this.error.set('Failed to capture image. Please try again.');
    }
  }

  handleInitError(error: WebcamInitError) {
    console.error('Webcam init error:', error);
    if (error.message) {
      this.webcamError.set(error.message);
    } else {
      this.webcamError.set('Failed to initialize camera. Please check permissions.');
    }
  }

  retakePhoto() {
    this.capturedImage.set('');
    this.error.set('');
    this.uploadSuccess.set(false);
  }

  async uploadPhoto() {
    if (!this.capturedImage() || !this.studentOpenEmisId) {
      this.error.set('No photo captured or missing student ID');
      return;
    }

    this.uploading.set(true);
    this.error.set('');

    try {
      // Convert data URL to blob
      const response = await fetch(this.capturedImage());
      const blob = await response.blob();

      // Create image element for cropping
      const img = new Image();
      img.onload = async () => {
        try {
          // Crop to square
          const canvas = this.photoService.cropToSquare(img, 300);
          const croppedBlob = await this.photoService.canvasToBlob(canvas, 0.8);

          // Upload to S3
          this.photoService.uploadStudentPhoto(this.studentOpenEmisId, croppedBlob).subscribe({
            next: (result) => {
              this.uploading.set(false);
              if (result.success) {
                this.uploadSuccess.set(true);
                this.photoUploaded.emit(result);
              } else {
                this.error.set(result.error || 'Upload failed');
              }
            },
            error: (err) => {
              this.uploading.set(false);
              console.error('Upload error:', err);
              this.error.set('Failed to upload photo. Please try again.');
            }
          });
        } catch (err) {
          this.uploading.set(false);
          console.error('Image processing error:', err);
          this.error.set('Failed to process image. Please try again.');
        }
      };

      img.onerror = () => {
        this.uploading.set(false);
        this.error.set('Failed to process captured image');
      };

      img.src = this.capturedImage();
    } catch (err) {
      this.uploading.set(false);
      console.error('Photo upload error:', err);
      this.error.set('Failed to prepare photo for upload');
    }
  }

  close() {
    this.resetState();
    this.closed.emit();
  }

  onOverlayClick(event: MouseEvent) {
    // Close modal when clicking outside
    this.close();
  }
}
