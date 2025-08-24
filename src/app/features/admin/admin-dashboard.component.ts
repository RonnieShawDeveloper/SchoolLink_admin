import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="route-enter" style="display:flex; flex-direction:column; gap:16px;">
      <h2 style="margin:0;">Admin Dashboard</h2>
      <div class="app-card" style="padding:16px;">
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px,1fr)); gap:16px;">
          <a routerLink="/admin/students" class="btn-primary" style="display:block; padding:16px; border-radius:10px; text-align:left;">
            <div style="font-size:1.1rem; font-weight:700;">Edit/Add Student</div>
            <div style="color: var(--bah-text-muted);">Search, edit and save student records</div>
          </a>
          <div class="app-card" style="padding:16px; opacity:0.6;">
            <div style="font-size:1.1rem; font-weight:700;">Classes</div>
            <div style="color: var(--bah-text-muted);">Coming soon</div>
          </div>
          <div class="app-card" style="padding:16px; opacity:0.6;">
            <div style="font-size:1.1rem; font-weight:700;">Teachers</div>
            <div style="color: var(--bah-text-muted);">Coming soon</div>
          </div>
          <div class="app-card" style="padding:16px; opacity:0.6;">
            <div style="font-size:1.1rem; font-weight:700;">Periods</div>
            <div style="color: var(--bah-text-muted);">Coming soon</div>
          </div>
          <div class="app-card" style="padding:16px; opacity:0.6;">
            <div style="font-size:1.1rem; font-weight:700;">Check-ins</div>
            <div style="color: var(--bah-text-muted);">Coming soon</div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminDashboardComponent {}
