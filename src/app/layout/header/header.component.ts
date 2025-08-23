import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { NavigationEnd, Router } from '@angular/router';

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
      <div style="margin-left:auto; display:flex; align-items:center; gap:12px;">
        <span class="chip" *ngIf="role() as r">{{ r }}</span>
        <button class="btn-primary" (click)="onLogout()">Logout</button>
      </div>
    </header>
  `
})
export class HeaderComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly role = computed(() => this.auth.role());
  readonly showLogo = signal<boolean>(true);

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

  private updateShowLogo(url: string) {
    const hide = url.startsWith('/students');
    this.showLogo.set(!hide);
  }

  onLogout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
