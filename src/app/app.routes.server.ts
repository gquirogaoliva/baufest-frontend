import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Employee ids come from mock data that can change; render on demand
    // rather than requiring every id to be enumerable at build time.
    path: 'empleados/:id',
    renderMode: RenderMode.Server
  },
  {
    // Onboarding tokens are per-employee and not enumerable at build time either.
    path: 'onboarding/:token',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
