import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { environment } from '../../environments/environment';

export type OnboardingStatus = 'en-progreso' | 'completado' | 'sin-iniciar';
export type StepStatus = 'completado' | 'entregado' | 'en-progreso' | 'pendiente';
export type KitStage = 'preparacion' | 'camino' | 'entregado';

/** The 4 real onboarding steps the backend tracks (see paso keys in `pasosOnboarding`). */
export type PasoKey = 'documentacion' | 'configuracion_equipo' | 'presentacion_equipo' | 'capacitacion_inicial';

export interface Employee {
  id: string;
  initials: string;
  name: string;
  role: string;
  area: string;
  completedSteps: number;
  totalSteps: number;
  status: OnboardingStatus;
  recent: boolean;
  joinDateLabel: string;
}

export interface OnboardingStep {
  label: string;
  status: StepStatus;
  date: string | null;
}

export interface EmployeeDetail extends Employee {
  email: string;
  /** Not tracked by the backend — only ever set client-side, never persisted or refetched. */
  phone?: string;
  pec?: { initials: string; name: string; role: string };
  kit: {
    name?: string;
    items?: string[];
    stage: KitStage;
    dates: { preparacion: string | null; camino: string | null; entregado: string | null };
    deliveryAddress?: string;
  };
  steps: OnboardingStep[];
}

export interface NewEmployeeInput {
  name: string;
  email: string;
  /** Sent to the backend as `telefono`. */
  phone: string;
  role: string;
  area: string;
  pec: { name: string; role: string };
  kitName: string;
  kitItems: string[];
}

interface BackendPaso {
  paso: string;
  completado: boolean;
}

interface BackendEmployee {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  puesto: string;
  area: string;
  fechaIngreso: string;
  token: string;
  estadoOnboarding: string;
  pasosOnboarding: BackendPaso[];
  kitEstado: string;
}

/** The UI keeps its original 6-step onboarding narrative (richer than the backend's 4 generic
 * steps), so each UI step is force-mapped onto the closest real backend paso for persistence —
 * several UI steps can share one backend key, which means they'll flip to "completado" together. */
const STEP_LABELS = [
  'Bienvenida',
  'Datos personales',
  'Datos de facturación',
  'Datos para obra social',
  'Cursos obligatorios',
  'Setup de bienvenida',
];

export const STEP_TO_BACKEND_PASO: Record<string, PasoKey> = {
  Bienvenida: 'presentacion_equipo',
  'Datos personales': 'documentacion',
  'Datos de facturación': 'documentacion',
  'Datos para obra social': 'documentacion',
  'Cursos obligatorios': 'capacitacion_inicial',
  'Setup de bienvenida': 'configuracion_equipo',
};

const STATUS_MAP: Record<string, OnboardingStatus> = {
  pendiente: 'sin-iniciar',
  'en progreso': 'en-progreso',
  completado: 'completado',
};

const KIT_STAGE_MAP: Record<string, KitStage> = {
  pendiente: 'preparacion',
  enviado: 'camino',
  entregado: 'entregado',
};

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const RECENT_THRESHOLD_DAYS = 30;

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function joinDateLabel(fechaIngreso: string): string {
  const [year, month, day] = fechaIngreso.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

function isRecent(fechaIngreso: string): boolean {
  const diffDays = (Date.now() - new Date(fechaIngreso).getTime()) / 86_400_000;
  return diffDays <= RECENT_THRESHOLD_DAYS;
}

function pasoCompletado(pasos: BackendPaso[], key: PasoKey): boolean {
  return pasos.some((p) => p.paso === key && p.completado);
}

function deriveSteps(pasos: BackendPaso[], kitEstado: string): OnboardingStep[] {
  return STEP_LABELS.map((label) => {
    if (label === 'Setup de bienvenida') {
      const status: StepStatus =
        kitEstado === 'entregado' ? 'entregado' : pasoCompletado(pasos, 'configuracion_equipo') ? 'completado' : 'pendiente';
      return { label, status, date: null };
    }
    const backendKey = STEP_TO_BACKEND_PASO[label];
    return { label, status: pasoCompletado(pasos, backendKey) ? 'completado' : 'pendiente', date: null };
  });
}

function toEmployee(be: BackendEmployee): Employee {
  const name = `${be.nombre} ${be.apellido}`;
  const steps = deriveSteps(be.pasosOnboarding, be.kitEstado);
  const completedSteps = steps.filter((s) => s.status === 'completado' || s.status === 'entregado').length;
  return {
    id: be.token,
    initials: initialsFor(name),
    name,
    role: be.puesto,
    area: be.area,
    completedSteps,
    totalSteps: steps.length,
    status: STATUS_MAP[be.estadoOnboarding] ?? 'sin-iniciar',
    recent: isRecent(be.fechaIngreso),
    joinDateLabel: joinDateLabel(be.fechaIngreso),
  };
}

function toEmployeeDetail(be: BackendEmployee): EmployeeDetail {
  return {
    ...toEmployee(be),
    email: be.email,
    phone: be.telefono,
    kit: {
      stage: KIT_STAGE_MAP[be.kitEstado] ?? 'preparacion',
      dates: { preparacion: null, camino: null, entregado: null },
    },
    steps: deriveSteps(be.pasosOnboarding, be.kitEstado),
  };
}

@Injectable({ providedIn: 'root' })
export class EmployeeDataService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/empleados`;

  getAll(): Observable<Employee[]> {
    return this.http.get<BackendEmployee[]>(this.baseUrl).pipe(map((list) => list.map(toEmployee)));
  }

  getRecentActivity(count = 4): Observable<Employee[]> {
    return this.getAll().pipe(map((employees) => employees.filter((e) => e.recent).slice(0, count)));
  }

  /** The backend doesn't track last-activity/inactivity — kept as example data until that metric exists. */
  getInactivityAlerts(): { initials: string; name: string; daysInactive: number }[] {
    return [
      { initials: 'FR', name: 'Florencia Ríos', daysInactive: 18 },
      { initials: 'AM', name: 'Agustina Mora', daysInactive: 9 },
    ];
  }

  getById(token: string): Observable<EmployeeDetail | undefined> {
    return this.http.get<BackendEmployee>(`${environment.apiUrl}/onboarding/${token}`).pipe(
      map(toEmployeeDetail),
      catchError(() => of(undefined)),
    );
  }

  createEmployee(input: NewEmployeeInput): Observable<Employee> {
    const [nombre, ...rest] = input.name.trim().split(/\s+/);
    const apellido = rest.join(' ') || nombre;
    const body = {
      nombre,
      apellido,
      email: input.email,
      puesto: input.role,
      area: input.area,
      fechaIngreso: new Date().toISOString().slice(0, 10),
      telefono: input.phone,
    };
    return this.http.post<BackendEmployee>(this.baseUrl, body).pipe(map(toEmployee));
  }

  completeStep(token: string, paso: PasoKey): Observable<EmployeeDetail> {
    return this.http
      .put<BackendEmployee>(`${environment.apiUrl}/onboarding/${token}/paso`, { paso, completado: true })
      .pipe(map(toEmployeeDetail));
  }

  sendReminder(email: string, nombre: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${environment.apiUrl}/mail/recordatorio`, { email, nombre });
  }
}
