import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { NavigationEnd, Router } from '@angular/router';
import { StudentApiService, SelectedSchoolData } from '../../core/services/student-api.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="header">
      <div class="brand">
        <img *ngIf="showLogo()" class="logo" src="/education_logo.png" alt="Logo" />
        <div class="title">SchoolLink ID</div>
        <div class="subtitle" style="font-size: 0.7rem">Manage your students' attendance</div>
      </div>

      <!-- Selected School Display -->
      <div *ngIf="selectedSchool()" style="flex: 1; display: flex; justify-content: center; align-items: center;">
        <div style="background: #E8F7FB; border: 1px solid #B3E5FC; border-radius: 6px; padding: 8px 16px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="font-size: 0.8rem; color: var(--bah-text-muted);">Current School:</div>
            <div style="font-weight: 600; color: #0B4F6C; font-size: 0.9rem;">{{ selectedSchool()?.InstitutionName }}</div>
            <div style="font-size: 0.75rem; color: var(--bah-text-muted);">({{ selectedSchool()?.InstitutionCode }})</div>
          </div>
        </div>
      </div>

      <div style="margin-left:auto; display:flex; align-items:center; gap:12px;">
        <span class="chip" *ngIf="role() as r">{{ r }}</span>
        <button class="btn-primary" (click)="onLogout()">Logout</button>
      </div>
    </header>
  `
})
export class HeaderComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly api = inject(StudentApiService);
  readonly role = computed(() => this.auth.role());
  readonly showLogo = signal<boolean>(true);
  readonly selectedSchool = signal<SelectedSchoolData | null>(null);

  constructor() {
    // Initialize based on current URL
    this.updateShowLogo(this.router.url);
    // Update on navigation
    this.router.events.subscribe(ev => {
      if (ev instanceof NavigationEnd) {
        this.updateShowLogo(ev.urlAfterRedirects);
      }
    });
  }

  ngOnInit() {
    // Subscribe to selected school changes
    this.api.selectedSchool$.subscribe(school => {
      this.selectedSchool.set(school);
    });
  }

  private updateShowLogo(url: string) {
    const hide = url.startsWith('/students');
    this.showLogo.set(!hide);
  }

  onLogout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
