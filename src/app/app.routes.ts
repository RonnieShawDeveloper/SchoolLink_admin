import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { ShellComponent } from './layout/shell/shell.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { StudentsListComponent } from './features/students/students-list/students-list.component';
import { StudentDetailComponent } from './features/students/student-detail/student-detail.component';
import { ClassesListComponent } from './features/classes/classes-list/classes-list.component';
import { ClassDetailComponent } from './features/classes/class-detail/class-detail.component';
import { ReportsHomeComponent } from './features/reports/reports-home/reports-home.component';
import { authGuard } from './core/guards/auth.guard';
import { AdminShellComponent } from './features/admin/admin-shell.component';
import { AdminStudentEditorComponent } from './features/admin/student-editor/student-editor.component';
import { AdminDashboardComponent } from './features/admin/admin-dashboard.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'students', component: StudentsListComponent },
      { path: 'students/:id', component: StudentDetailComponent },
      { path: 'classes', component: ClassesListComponent },
      { path: 'classes/:id', component: ClassDetailComponent },
      { path: 'reports', component: ReportsHomeComponent },
      {
        path: 'admin',
        component: AdminShellComponent,
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'home' },
          { path: 'home', component: AdminDashboardComponent },
          { path: 'students', component: AdminStudentEditorComponent },
        ]
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];
