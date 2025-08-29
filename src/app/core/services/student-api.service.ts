import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { StudentData } from '../models/student-data';

export interface SearchResponse {
  items: StudentData[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SchoolOption {
  InstitutionCode: string;
  InstitutionName: string;
  Ownewship: string;
  Type: string;
  Sector: string;
  Provider: string;
  Locality: string;
  AreaEducationCode: string;
  AreaEducation: string;
  AreaAdministrativeCode: string;
  AreaAdministrative: string;
}

export interface AcademicUpdateData {
  EducationGrade: string;
  AcademicPeriod: string;
  StartDate: string;
  EndDate: string;
}

export interface SelectedSchoolData {
  InstitutionCode: string;
  InstitutionName: string;
}

export interface SchoolStatistics {
  totalStudents: number;
  maleCount: number;
  femaleCount: number;
  institutionCode: string;
}

export interface StudentScanData {
  gateIn?: string;
  gateOut?: string;
}

export interface StudentScansResponse {
  success: boolean;
  data: { [studentId: string]: StudentScanData };
  processedCount: number;
  scansFound: number;
}


@Injectable({ providedIn: 'root' })
export class StudentApiService {
  private readonly http = inject(HttpClient);
  private readonly SELECTED_SCHOOL_KEY = 'schoollink_selected_school';
  private selectedSchoolSubject = new BehaviorSubject<SelectedSchoolData | null>(null);

  constructor() {
    // Load saved school from localStorage on service initialization
    this.loadSelectedSchoolFromStorage();
  }

  // Observable for components to subscribe to selected school changes
  get selectedSchool$(): Observable<SelectedSchoolData | null> {
    return this.selectedSchoolSubject.asObservable();
  }

  // Get current selected school synchronously
  get selectedSchool(): SelectedSchoolData | null {
    return this.selectedSchoolSubject.value;
  }

  // Set selected school and persist to localStorage
  setSelectedSchool(school: SelectedSchoolData | null): void {
    if (school) {
      localStorage.setItem(this.SELECTED_SCHOOL_KEY, JSON.stringify(school));
    } else {
      localStorage.removeItem(this.SELECTED_SCHOOL_KEY);
    }
    this.selectedSchoolSubject.next(school);
  }

  // Load selected school from localStorage
  private loadSelectedSchoolFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.SELECTED_SCHOOL_KEY);
      if (saved) {
        const school = JSON.parse(saved) as SelectedSchoolData;
        this.selectedSchoolSubject.next(school);
      }
    } catch (error) {
      console.warn('Failed to load selected school from localStorage:', error);
      localStorage.removeItem(this.SELECTED_SCHOOL_KEY);
    }
  }

  private baseUrl(): string {
    // Configure this at runtime by setting window.STUDENT_API_BASE in index.html or via hosting env.
    // Example: https://abc123.execute-api.us-east-1.amazonaws.com/prod
    const w = globalThis as any;
    const fromWindow = (w.STUDENT_API_BASE as string) || '';
    const fromAmplify = w.amplifyOutputs?.custom?.STUDENT_API_BASE || '';
    const raw = (fromWindow || fromAmplify || '').toString();
    return raw.replace(/\/+$/, ''); // strip trailing slashes to avoid double slashes when joining paths
  }

  private scansBaseUrl(): string {
    // Configure this at runtime by setting window.STUDENT_SCANS_API_BASE in index.html or via hosting env.
    const w = globalThis as any;
    const fromWindow = (w.STUDENT_SCANS_API_BASE as string) || '';
    const fromAmplify = w.amplifyOutputs?.custom?.STUDENT_SCANS_API_BASE || '';
    const raw = (fromWindow || fromAmplify || '').toString();
    return raw.replace(/\/+$/, ''); // strip trailing slashes to avoid double slashes when joining paths
  }

  // Resolve scans endpoint path or absolute URL based on runtime window.SCANS_TODAY_PATH

  searchStudents(q: string, page = 1, limit = 20): Observable<SearchResponse> {
    const params = new HttpParams().set('q', q).set('page', page).set('limit', limit);
    return this.http.get<SearchResponse>(`${this.baseUrl()}/students/search`, { params });
  }

  studentsByInstitution(q: string, page = 1, limit = 20): Observable<SearchResponse> {
    const params = new HttpParams().set('q', q).set('page', page).set('limit', limit);
    return this.http.get<SearchResponse>(`${this.baseUrl()}/students/by-institution`, { params });
  }

  updateStudent(payload: Partial<StudentData> & { StudentID?: number; StudentOpenEMIS_ID?: string }): Observable<any> {
    return this.http.post(`${this.baseUrl()}/students/update`, payload);
  }

  getStudentCount(): Observable<{ totalRecords: number }> {
    return this.http.get<{ totalRecords: number }>(`${this.baseUrl()}/students/count`);
  }

  getSchoolsList(): Observable<{ schools: SchoolOption[] }> {
    return this.http.get<{ schools: SchoolOption[] }>(`${this.baseUrl()}/schools/list`);
  }

  getStudentsBySchool(institutionCode: string): Observable<SearchResponse> {
    const params = new HttpParams().set('institutionCode', institutionCode);
    return this.http.get<SearchResponse>(`${this.baseUrl()}/students/by-school`, { params });
  }

  getSchoolStatistics(institutionCode: string): Observable<SchoolStatistics> {
    const params = new HttpParams().set('institutionCode', institutionCode);
    return this.http.get<SchoolStatistics>(`${this.baseUrl()}/students/school-stats`, { params });
  }

  getStudentById(studentId: number): Observable<{ student: StudentData }> {
    return this.http.get<{ student: StudentData }>(`${this.baseUrl()}/students/${studentId}`);
  }

  /**
   * Get scan data (gate in/out times) for multiple students
   * Handles batch processing with max 200 student IDs per request
   */
  getStudentScans(studentIds: string[]): Observable<{ [studentId: string]: StudentScanData }> {
    if (!studentIds || studentIds.length === 0) {
      return of({});
    }

    // Split student IDs into chunks of 200
    const chunks = this.chunkArray(studentIds, 200);

    // If only one chunk, make direct request
    if (chunks.length === 1) {
      return this.fetchScanBatch(chunks[0]).pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Error fetching student scans:', error);
          // Return empty data for all students on error
          const emptyData: { [studentId: string]: StudentScanData } = {};
          studentIds.forEach(id => emptyData[id] = {});
          return of(emptyData);
        })
      );
    }

    // Process multiple chunks concurrently
    const batchRequests = chunks.map(chunk =>
      this.fetchScanBatch(chunk).pipe(
        catchError(error => {
          console.error('Error fetching scan batch:', error);
          // Return empty data for this batch on error
          const emptyData: { [studentId: string]: StudentScanData } = {};
          chunk.forEach(id => emptyData[id] = {});
          return of({ success: false, data: emptyData, processedCount: chunk.length, scansFound: 0 });
        })
      )
    );

    return forkJoin(batchRequests).pipe(
      map(responses => {
        // Merge all batch responses into single data object
        const mergedData: { [studentId: string]: StudentScanData } = {};
        responses.forEach(response => {
          Object.assign(mergedData, response.data);
        });
        return mergedData;
      })
    );
  }

  /**
   * Fetch scan data for a single batch of student IDs (max 200)
   */
  private fetchScanBatch(studentIds: string[]): Observable<StudentScansResponse> {
    const payload = { studentIds };
    return this.http.post<StudentScansResponse>(this.scansBaseUrl(), payload);
  }

  /**
   * Split array into chunks of specified size
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

}
