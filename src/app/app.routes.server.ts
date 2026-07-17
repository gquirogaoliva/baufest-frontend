import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Reads live data from the backend on every visit — prerendering would freeze
    // the employee list/dashboard at whatever the backend returned during the build.
    path: 'dashboard',
    renderMode: RenderMode.Server
  },
  {
    path: 'empleados',
    renderMode: RenderMode.Server
  },
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
