import { Injectable } from '@angular/core';
import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface PhotoUploadResult {
  success: boolean;
  photoUrl?: string;
  error?: string;
}

export interface PhotoUrlResult {
  success: boolean;
  photoUrl?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StudentPhotoService {
  private readonly BUCKET_NAME = 'schoollink-student-photos';
  private readonly BUCKET_PATH = 'student-photos/';
  private readonly s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      region: 'us-east-1', // Same region as the bucket
      // Credentials will be handled by AWS SDK credential chain
    });
  }

  /**
   * Uploads a student photo to S3 using the StudentOpenEMIS_ID as the filename
   * @param studentOpenEmisId The student's OpenEMIS ID
   * @param photoBlob The photo as a Blob
   * @returns Observable with upload result
   */
  uploadStudentPhoto(studentOpenEmisId: string, photoBlob: Blob): Observable<PhotoUploadResult> {
    if (!studentOpenEmisId) {
      return of({ success: false, error: 'Student OpenEMIS ID is required' });
    }

    const key = `${this.BUCKET_PATH}${studentOpenEmisId}.jpg`;

    const command = new PutObjectCommand({
      Bucket: this.BUCKET_NAME,
      Key: key,
      Body: photoBlob,
      ContentType: 'image/jpeg',
    });

    return from(this.s3Client.send(command)).pipe(
      map(() => {
        const photoUrl = this.generatePhotoUrl(studentOpenEmisId);
        return { success: true, photoUrl };
      }),
      catchError((error) => {
        console.error('Error uploading student photo:', error);
        return of({
          success: false,
          error: `Failed to upload photo: ${error.message || 'Unknown error'}`
        });
      })
    );
  }

  /**
   * Gets the URL for a student's photo
   * @param studentOpenEmisId The student's OpenEMIS ID
   * @returns Observable with photo URL result
   */
  getStudentPhotoUrl(studentOpenEmisId: string): Observable<PhotoUrlResult> {
    if (!studentOpenEmisId) {
      return of({ success: false, error: 'Student OpenEMIS ID is required' });
    }

    const key = `${this.BUCKET_PATH}${studentOpenEmisId}.jpg`;

    const command = new HeadObjectCommand({
      Bucket: this.BUCKET_NAME,
      Key: key
    });

    return from(this.s3Client.send(command)).pipe(
      map(() => ({
        success: true,
        photoUrl: this.generatePhotoUrl(studentOpenEmisId)
      })),
      catchError((error) => {
        // Photo doesn't exist or other error
        console.warn(`No photo found for student ${studentOpenEmisId}:`, error);
        return of({
          success: false,
          error: 'Photo not found'
        });
      })
    );
  }

  /**
   * Deletes a student's photo from S3
   * @param studentOpenEmisId The student's OpenEMIS ID
   * @returns Observable with deletion result
   */
  deleteStudentPhoto(studentOpenEmisId: string): Observable<PhotoUploadResult> {
    if (!studentOpenEmisId) {
      return of({ success: false, error: 'Student OpenEMIS ID is required' });
    }

    const key = `${this.BUCKET_PATH}${studentOpenEmisId}.jpg`;

    const command = new DeleteObjectCommand({
      Bucket: this.BUCKET_NAME,
      Key: key
    });

    return from(this.s3Client.send(command)).pipe(
      map(() => ({ success: true })),
      catchError((error) => {
        console.error('Error deleting student photo:', error);
        return of({
          success: false,
          error: `Failed to delete photo: ${error.message || 'Unknown error'}`
        });
      })
    );
  }

  /**
   * Generates a public URL for a student photo (for display purposes)
   * Note: This assumes the bucket is configured for public read access
   * @param studentOpenEmisId The student's OpenEMIS ID
   * @returns The constructed photo URL
   */
  private generatePhotoUrl(studentOpenEmisId: string): string {
    // Using the actual S3 bucket URL for schoollink-student-photos
    return `https://schoollink-student-photos.s3.amazonaws.com/${this.BUCKET_PATH}${studentOpenEmisId}.jpg`;
  }

  /**
   * Converts a canvas element to a Blob for uploading
   * @param canvas The canvas element containing the photo
   * @param quality JPEG quality (0-1)
   * @returns Promise resolving to a Blob
   */
  canvasToBlob(canvas: HTMLCanvasElement, quality: number = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        'image/jpeg',
        quality
      );
    });
  }

  /**
   * Crops and resizes an image to a square format
   * @param imageElement The image element to crop
   * @param size The desired square size (width and height)
   * @returns A canvas element with the cropped image
   */
  cropToSquare(imageElement: HTMLImageElement, size: number = 300): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Unable to get canvas context');
    }

    canvas.width = size;
    canvas.height = size;

    // Calculate crop dimensions to maintain aspect ratio
    const sourceSize = Math.min(imageElement.width, imageElement.height);
    const sourceX = (imageElement.width - sourceSize) / 2;
    const sourceY = (imageElement.height - sourceSize) / 2;

    // Draw the cropped and resized image
    ctx.drawImage(
      imageElement,
      sourceX, sourceY, sourceSize, sourceSize, // Source rectangle
      0, 0, size, size // Destination rectangle
    );

    return canvas;
  }
}
