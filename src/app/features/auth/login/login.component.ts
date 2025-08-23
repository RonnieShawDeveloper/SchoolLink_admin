import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, UserRole } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-layout">
      <div class="login-left">
        <img src="/education_logo.png" alt="Logo" style="max-width: 340px; width: 60%; object-fit: contain; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.25));" />
      </div>
      <div class="login-right">
        <div class="login-card route-enter">
          <h2>Welcome to SchoolLink ID</h2>
          <p style="color: var(--bah-text-muted); margin-bottom: 16px;">Sign in to continue</p>
          <form (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label>Username</label>
              <input class="input" name="username" [(ngModel)]="username" placeholder="e.g. jsmith" required />
            </div>
            <div class="form-group">
              <label>Role</label>
              <select class="input" name="role" [(ngModel)]="role" required>
                <option [ngValue]="'Admin'">Admin</option>
                <option [ngValue]="'Teacher'">Teacher</option>
                <option [ngValue]="'Security'">Security</option>
              </select>
            </div>
            <button type="submit" class="btn-primary" style="width:100%; margin-top: 8px;">Sign In</button>
          </form>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  username = '';
  role: UserRole = 'Admin';

  onSubmit() {
    if (!this.username || !this.role) return;
    this.auth.login(this.username, this.role);
    this.router.navigateByUrl('/dashboard');
  }
}
