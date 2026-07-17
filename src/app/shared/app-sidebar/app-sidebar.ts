import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

export type SidebarActiveItem = 'nuevo' | 'empleados';

@Component({
  selector: 'app-sidebar',
  templateUrl: './app-sidebar.html',
  styleUrl: './app-sidebar.scss',
})
export class AppSidebar {
  private readonly router = inject(Router);

  readonly active = input.required<SidebarActiveItem>();

  goToNewEmployee(): void {
    this.router.navigateByUrl('/empleados/nuevo');
  }

  goToEmployees(): void {
    this.router.navigateByUrl('/empleados');
  }
}
