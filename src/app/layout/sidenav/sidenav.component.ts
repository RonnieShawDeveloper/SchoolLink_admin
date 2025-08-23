import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="sidenav">
      <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
      <a routerLink="/students" routerLinkActive="active">Students</a>
      <a routerLink="/classes" routerLinkActive="active">Classes</a>
      <a routerLink="/reports" routerLinkActive="active">Reports</a>
    </nav>
  `
})
export class SidenavComponent {}
