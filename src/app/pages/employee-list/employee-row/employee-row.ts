import { Component, input, output } from '@angular/core';

import { Employee, OnboardingStatus } from '../../../services/employee-data';

const STATUS_LABEL: Record<OnboardingStatus, string> = {
  'en-progreso': 'En progreso',
  completado: 'Completado',
  'sin-iniciar': 'Sin iniciar',
};

@Component({
  selector: 'app-employee-row',
  templateUrl: './employee-row.html',
  styleUrl: './employee-row.scss',
})
export class EmployeeRow {
  readonly employee = input.required<Employee>();
  readonly showRecentBadge = input(false);
  readonly highlighted = input(false);
  readonly rowClick = output<string>();

  protected readonly statusLabel = (status: OnboardingStatus) => STATUS_LABEL[status];

  onClick(): void {
    this.rowClick.emit(this.employee().id);
  }
}
