import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
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

// Scans API response contracts
export interface TodayScanItem {
  student_id: string | number;
  latestInAt?: string;  // ISO string in school local time or UTC
  latestOutAt?: string; // ISO string in school local time or UTC
}

export interface TodayScansResponse {
  items: TodayScanItem[];
  timezone?: string; // IANA timezone of conversion if provided by backend
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
    const raw = (w.STUDENT_API_BASE as string) || '';
    return raw.replace(/\/+$/, ''); // strip trailing slashes to avoid double slashes when joining paths
  }

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

  // Fetch today's latest Gate In/Out scans for a batch of students (no school filter)
  getTodayScans(studentOpenEmisIds: (string | number)[]): Observable<TodayScansResponse> {
    const ids = (studentOpenEmisIds || [])
      .filter((v) => v !== undefined && v !== null)
      .map((v) => String(v).trim())
      .filter((v) => v.length > 0);

    if (ids.length === 0) {
      return of({ items: [] });
    }

    const base = this.baseUrl();
    const chunkSize = 200; // reasonable batch size to keep payloads small and parallelize

    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += chunkSize) {
      chunks.push(ids.slice(i, i + chunkSize));
    }

    const requests = chunks.map(part => this.http.post<TodayScansResponse>(`${base}/scans/today`, {
      student_ids: part
    }));

    if (requests.length === 1) {
      return requests[0];
    }

    return forkJoin(requests).pipe(
      map(responses => {
        const merged: TodayScansResponse = { items: [] };
        for (const r of responses) {
          if (r?.items?.length) merged.items.push(...r.items);
          if (!merged.timezone && r?.timezone) merged.timezone = r.timezone;
        }
        return merged;
      })
    );
  }
}
