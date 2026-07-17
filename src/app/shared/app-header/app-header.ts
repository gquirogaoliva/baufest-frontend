import { Component, inject, input } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

import { ThemeService } from '../../services/theme';

@Component({
  selector: 'app-header',
  templateUrl: './app-header.html',
  styleUrl: './app-header.scss',
})
export class AppHeader {
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  protected readonly themeService = inject(ThemeService);

  readonly title = input.required<string>();
  readonly showBack = input(false);

  goBack(): void {
    this.location.back();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  logout(): void {
    this.router.navigateByUrl('/');
  }
}
