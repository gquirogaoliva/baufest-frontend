import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Employee, EmployeeDataService, OnboardingStatus } from '../../services/employee-data';
import { ToastQueueService } from '../../services/toast-queue';
import { AppHeader } from '../../shared/app-header/app-header';
import { AppSidebar } from '../../shared/app-sidebar/app-sidebar';
import { Toast } from '../../shared/toast/toast';
import { EmployeeRow } from './employee-row/employee-row';

/** Accent-insensitive: Spanish speakers routinely skip typing tildes/acutes. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

@Component({
  selector: 'app-employee-list',
  imports: [AppHeader, AppSidebar, EmployeeRow, Toast],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.scss',
})
export class EmployeeList {
  private readonly employeeData = inject(EmployeeDataService);
  private readonly toastQueue = inject(ToastQueueService);
  private readonly router = inject(Router);

  private readonly allEmployees = signal<Employee[]>([]);
  protected readonly areas = computed(() =>
    Array.from(new Set(this.allEmployees().map((e) => e.area))).sort((a, b) => a.localeCompare(b)),
  );

  private readonly queuedToast = this.toastQueue.consume();

  protected readonly toastMessage = signal<string | null>(this.queuedToast?.message ?? null);
  protected readonly highlightedEmployeeId = signal<string | null>(this.queuedToast?.highlightId ?? null);
  private toastResetTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private highlightResetTimeoutId: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    if (this.toastMessage()) {
      this.toastResetTimeoutId = setTimeout(() => this.toastMessage.set(null), 3000);
    }
    if (this.highlightedEmployeeId()) {
      // Matches the row's own bg-fade animation — clears the signal once
      // the visual highlight is fully gone, so a later re-render can't replay it.
      this.highlightResetTimeoutId = setTimeout(() => this.highlightedEmployeeId.set(null), 5000);
    }

    this.employeeData.getAll().subscribe((employees) => this.allEmployees.set(employees));
  }

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<'todos' | OnboardingStatus>('todos');
  protected readonly areaFilter = signal<'todas' | string>('todas');

  private readonly filtered = computed<Employee[]>(() => {
    const term = normalize(this.searchTerm().trim());
    const status = this.statusFilter();
    const area = this.areaFilter();

    return this.allEmployees().filter((employee) => {
      const matchesTerm =
        !term ||
        normalize(employee.name).includes(term) ||
        normalize(employee.role).includes(term) ||
        normalize(employee.area).includes(term);
      const matchesStatus = status === 'todos' || employee.status === status;
      const matchesArea = area === 'todas' || employee.area === area;
      return matchesTerm && matchesStatus && matchesArea;
    });
  });

  protected readonly recentEmployees = computed(() => this.filtered().filter((e) => e.recent));
  protected readonly previousEmployees = computed(() => this.filtered().filter((e) => !e.recent));

  protected readonly totalCount = computed(() => this.allEmployees().length);

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onStatusFilterChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as 'todos' | OnboardingStatus);
  }

  onAreaFilterChange(event: Event): void {
    this.areaFilter.set((event.target as HTMLSelectElement).value);
  }

  goToDetail(id: string): void {
    this.router.navigate(['/empleados', id]);
  }
}
