import { Injectable } from '@angular/core';

export interface GrowthPoint {
  month: string;
  incorporaciones: number;
  completados: number;
}

/**
 * Backend isn't built yet. Mirrors the approved dashboard reference with
 * static mock data. Replace with real HTTP calls once the API exists.
 */
@Injectable({ providedIn: 'root' })
export class DashboardDataService {
  getGrowthSeries(): GrowthPoint[] {
    return [
      { month: 'Ene', incorporaciones: 4, completados: 3 },
      { month: 'Feb', incorporaciones: 5, completados: 4 },
      { month: 'Mar', incorporaciones: 5, completados: 5 },
      { month: 'Abr', incorporaciones: 7, completados: 6 },
      { month: 'May', incorporaciones: 6, completados: 6 },
      { month: 'Jun', incorporaciones: 7, completados: 7 },
      { month: 'Jul', incorporaciones: 11, completados: 9 },
      { month: 'Ago', incorporaciones: 8, completados: 9 },
      { month: 'Sep', incorporaciones: 13, completados: 11 },
      { month: 'Oct', incorporaciones: 10, completados: 11 },
      { month: 'Nov', incorporaciones: 16, completados: 14 },
      { month: 'Dic', incorporaciones: 11, completados: 14 },
    ];
  }
}
