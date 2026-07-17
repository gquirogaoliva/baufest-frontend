import { Routes } from '@angular/router';

import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { EmployeeList } from './pages/employee-list/employee-list';
import { EmployeeNew } from './pages/employee-new/employee-new';
import { EmployeeDetail } from './pages/employee-detail/employee-detail';
import { Onboarding } from './pages/onboarding/onboarding';

export const routes: Routes = [
  { path: '', component: Login, pathMatch: 'full' },
  { path: 'dashboard', component: Dashboard },
  { path: 'empleados', component: EmployeeList },
  { path: 'empleados/nuevo', component: EmployeeNew },
  { path: 'empleados/:id', component: EmployeeDetail },
  { path: 'onboarding/:token', component: Onboarding },
];
