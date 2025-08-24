import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="route-enter" style="display:grid; grid-template-columns: 220px 1fr; gap:16px; align-items:start;">
      <aside class="app-card" style="padding:12px;">
        <h3 style="margin:4px 0 8px 0;">Admin</h3>
        <nav style="display:flex; flex-direction:column; gap:6px;">
          <a routerLink="/admin/home" routerLinkActive="active" class="btn-primary" style="text-align:left;">Dashboard</a>
          <a routerLink="/admin/students" routerLinkActive="active" class="btn-primary" style="text-align:left;">Edit/Add Student</a>
          <a routerLink="/admin/classes" routerLinkActive="active" class="btn-primary" style="opacity:0.6; pointer-events:none; text-align:left;">Classes (coming soon)</a>
          <a routerLink="/admin/teachers" routerLinkActive="active" class="btn-primary" style="opacity:0.6; pointer-events:none; text-align:left;">Teachers (coming soon)</a>
          <a routerLink="/admin/periods" routerLinkActive="active" class="btn-primary" style="opacity:0.6; pointer-events:none; text-align:left;">Periods (coming soon)</a>
          <a routerLink="/admin/checkins" routerLinkActive="active" class="btn-primary" style="opacity:0.6; pointer-events:none; text-align:left;">Check-ins (coming soon)</a>
        </nav>
      </aside>
      <section>
        <router-outlet></router-outlet>
      </section>
    </div>
  `
})
export class AdminShellComponent {}
