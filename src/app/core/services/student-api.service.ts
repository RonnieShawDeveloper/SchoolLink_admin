import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StudentData } from '../models/student-data';

export interface SearchResponse {
  items: StudentData[];
  total: number;
  page: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class StudentApiService {
  private readonly http = inject(HttpClient);

  private baseUrl(): string {
    // Configure this at runtime by setting window.STUDENT_API_BASE in index.html or via hosting env.
    // Example: https://abc123.execute-api.us-east-1.amazonaws.com/prod
    const w = globalThis as any;
    return (w.STUDENT_API_BASE as string) || '';
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
}
