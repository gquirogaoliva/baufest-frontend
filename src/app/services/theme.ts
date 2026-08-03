import { effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'baufest-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly theme = signal<Theme>(this.readInitialTheme());

  constructor() {
    effect(() => {
      if (!this.isBrowser) {
        return;
      }
      document.documentElement.setAttribute('data-theme', this.theme());
      localStorage.setItem(STORAGE_KEY, this.theme());
    });
  }

  private readInitialTheme(): Theme {
    if (!this.isBrowser) {
      return 'light';
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'dark' || saved === 'light' ? saved : 'light';
  }

  toggle(): void {
    this.theme.update((current) => (current === 'light' ? 'dark' : 'light'));
  }
}
