import { Injectable, signal, computed } from '@angular/core';

export type UserRole = 'Admin' | 'Teacher' | 'Security';

interface StoredAuth {
  username: string;
  role: UserRole;
}

const STORAGE_KEY = 'sl_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _username = signal<string | null>(null);
  private _role = signal<UserRole | null>(null);

  readonly username = computed(() => this._username());
  readonly role = computed(() => this._role());

  constructor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredAuth;
        this._username.set(parsed.username);
        this._role.set(parsed.role);
      }
    } catch {
      // ignore
    }
  }

  isAuthenticated(): boolean {
    return this._role() !== null;
  }

  login(username: string, role: UserRole): void {
    this._username.set(username);
    this._role.set(role);
    try {
      const payload: StoredAuth = { username, role };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage errors in mock
    }
  }

  logout(): void {
    this._username.set(null);
    this._role.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
