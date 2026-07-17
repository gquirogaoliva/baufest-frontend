import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { DashboardDataService } from '../../services/dashboard-data';
import { EmployeeDataService, OnboardingStatus } from '../../services/employee-data';
import { AppHeader } from '../../shared/app-header/app-header';
import { AppSidebar } from '../../shared/app-sidebar/app-sidebar';
import { GrowthChart } from './growth-chart/growth-chart';

const STATUS_LABEL: Record<OnboardingStatus, string> = {
  'en-progreso': 'En progreso',
  completado: 'Completado',
  'sin-iniciar': 'Sin iniciar',
};

@Component({
  selector: 'app-dashboard',
  imports: [GrowthChart, AppHeader, AppSidebar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly dashboardData = inject(DashboardDataService);
  private readonly employeeData = inject(EmployeeDataService);
  private readonly router = inject(Router);

  protected readonly recentActivity = this.employeeData.getRecentActivity();
  protected readonly inactivityAlerts = this.employeeData.getInactivityAlerts();
  protected readonly growthSeries = this.dashboardData.getGrowthSeries();

  statusLabel(status: OnboardingStatus): string {
    return STATUS_LABEL[status];
  }

  goToNewEmployee(): void {
    this.router.navigateByUrl('/empleados/nuevo');
  }
}
