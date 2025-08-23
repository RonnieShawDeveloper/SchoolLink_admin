import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidenavComponent } from '../sidenav/sidenav.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, SidenavComponent],
  template: `
    <app-header />
    <div class="main">
      <app-sidenav />
      <main>
        <div class="route-enter">
          <router-outlet />
        </div>
      </main>
    </div>
  `
})
export class ShellComponent {}
