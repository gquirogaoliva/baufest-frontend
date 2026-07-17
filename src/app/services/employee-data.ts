import { Injectable } from '@angular/core';

export type OnboardingStatus = 'en-progreso' | 'completado' | 'sin-iniciar';
export type StepStatus = 'completado' | 'entregado' | 'en-progreso' | 'pendiente';
export type KitStage = 'preparacion' | 'camino' | 'entregado';

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
  phone: string;
  pec: { initials: string; name: string; role: string };
  kit: {
    name: string;
    items: string[];
    stage: KitStage;
    dates: { preparacion: string; camino: string | null; entregado: string | null };
    deliveryAddress: string;
  };
  steps: OnboardingStep[];
}

const STEP_LABELS = [
  'Bienvenida',
  'Datos personales',
  'Datos de facturación',
  'Datos para obra social',
  'Cursos obligatorios',
  'Setup de bienvenida',
];

const DEFAULT_PEC = { initials: 'GQO', name: 'Guadalupe Quiroga Oliva', role: 'Engineering Manager' };
const DEFAULT_KIT_ITEMS = ['MacBook Pro', 'Mouse Magic', 'AirPods Pro', 'Merch Baufest'];
const DEFAULT_KIT_DELIVERY_ADDRESS = 'Av. Corrientes 1234, CABA';
const JOIN_MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export interface NewEmployeeInput {
  name: string;
  email: string;
  phone: string;
  role: string;
  area: string;
  pec: { name: string; role: string };
  kitName: string;
  kitItems: string[];
}

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function emailFor(name: string): string {
  return `${slugify(name).replace(/-/g, '.')}@baufest.com`;
}

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function todayJoinLabel(): string {
  const now = new Date();
  return `${now.getDate()} ${JOIN_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

/** Backend isn't built yet. This is the single canonical employee dataset — the
 * Dashboard's "Actividad reciente" / "Alertas" and the Employees screens all read
 * from here so names, progress, and dates never drift out of sync across screens. */
@Injectable({ providedIn: 'root' })
export class EmployeeDataService {
  private readonly employees: Employee[] = [
    this.emp('VG', 'Valentina Gómez', 'UX Designer', 'AI Digital Products', 3, 'en-progreso', true, '14 Jul 2026'),
    this.emp('ML', 'Martín López', 'Backend Dev', 'Ingeniería', 6, 'completado', true, '10 Jul 2026'),
    this.emp('LF', 'Lucía Fernández', 'PM Senior', 'Producto', 0, 'sin-iniciar', true, '8 Jul 2026'),
    this.emp('CM', 'Carolina Méndez', 'QA Engineer', 'Calidad', 2, 'en-progreso', true, '1 Jul 2026'),
    this.emp('ST', 'Sofía Torres', 'Tech Lead', 'Ingeniería', 4, 'en-progreso', true, '25 Jun 2026'),
    this.emp('RS', 'Rodrigo Sánchez', 'Frontend Dev', 'Ingeniería', 6, 'completado', true, '20 Jun 2026'),
    this.emp('AM', 'Agustina Mora', 'Data Scientist', 'Analytics', 1, 'en-progreso', true, '15 Jun 2026'),
    this.emp('PV', 'Pablo Vega', 'DevOps Engineer', 'Cloud & DevOps', 6, 'completado', true, '10 Jun 2026'),
    this.emp('FR', 'Florencia Ríos', 'UX Designer', 'Producto', 0, 'sin-iniciar', true, '5 Jun 2026'),
    this.emp('AC', 'Andrés Castillo', 'Full Stack Dev', 'Ingeniería', 6, 'completado', false, '20 May 2026'),
    this.emp('BH', 'Beatriz Herrera', 'Project Manager', 'Delivery', 6, 'completado', false, '10 May 2026'),
    this.emp('CB', 'Carlos Beltrán', 'QA Engineer', 'Calidad', 6, 'completado', false, '28 Abr 2026'),
    this.emp('DF', 'Daniela Fuentes', 'Product Owner', 'Producto', 6, 'completado', false, '15 Abr 2026'),
    this.emp('EG', 'Elena Gutiérrez', 'UX Designer', 'AI Digital Products', 6, 'completado', false, '2 Abr 2026'),
  ];

  /** Contact/PEC/kit data captured for employees created through the "Nuevo empleado"
   * form — keyed by id, checked by deriveDetail before it falls back to the defaults. */
  private readonly createdDetails = new Map<
    string,
    { email: string; phone: string; pec: { initials: string; name: string; role: string }; kit: { name: string; items: string[] } }
  >();

  private emp(
    initials: string,
    name: string,
    role: string,
    area: string,
    completedSteps: number,
    status: OnboardingStatus,
    recent: boolean,
    joinDateLabel: string,
  ): Employee {
    return { id: slugify(name), initials, name, role, area, completedSteps, totalSteps: 6, status, recent, joinDateLabel };
  }

  getAll(): Employee[] {
    return this.employees;
  }

  getAreas(): string[] {
    return Array.from(new Set(this.employees.map((e) => e.area))).sort((a, b) => a.localeCompare(b));
  }

  /** Used by the "Nuevo empleado" form. Adds the employee to the top of the list
   * (so it shows first under "Recientes") and remembers the contact/PEC/kit data
   * the form captured, so getById reflects what was actually entered. */
  createEmployee(input: NewEmployeeInput): Employee {
    const employee = this.emp(
      initialsFor(input.name),
      input.name,
      input.role,
      input.area,
      0,
      'sin-iniciar',
      true,
      todayJoinLabel(),
    );
    this.employees.unshift(employee);
    this.createdDetails.set(employee.id, {
      email: input.email,
      phone: input.phone,
      pec: { initials: initialsFor(input.pec.name), name: input.pec.name, role: input.pec.role },
      kit: { name: input.kitName, items: input.kitItems },
    });
    return employee;
  }

  /** Top N most recently joined — used by the Dashboard's "Actividad reciente". */
  getRecentActivity(count = 4): Employee[] {
    return this.employees.filter((e) => e.recent).slice(0, count);
  }

  /** Employees flagged as stalled. Picked from the real dataset so names never
   * refer to someone who doesn't actually exist in the Employees list. */
  getInactivityAlerts(): { initials: string; name: string; daysInactive: number }[] {
    return [
      { initials: 'FR', name: 'Florencia Ríos', daysInactive: 18 },
      { initials: 'AM', name: 'Agustina Mora', daysInactive: 9 },
    ];
  }

  getById(id: string): EmployeeDetail | undefined {
    const employee = this.employees.find((e) => e.id === id);
    if (!employee) {
      return undefined;
    }
    if (employee.id === 'valentina-gomez') {
      return this.valentinaDetail(employee);
    }
    return this.deriveDetail(employee);
  }

  /** The one fully-specified example from the approved reference. */
  private valentinaDetail(employee: Employee): EmployeeDetail {
    return {
      ...employee,
      email: 'valentina.gomez@baufest.com',
      phone: '+54 11 1234-5678',
      pec: DEFAULT_PEC,
      kit: {
        name: 'Kit Diseño',
        items: DEFAULT_KIT_ITEMS,
        stage: 'camino',
        dates: { preparacion: '16 Jul 2026', camino: '17 Jul 2026', entregado: null },
        deliveryAddress: DEFAULT_KIT_DELIVERY_ADDRESS,
      },
      steps: [
        { label: 'Bienvenida', status: 'completado', date: '14 Jul 2026' },
        { label: 'Datos personales', status: 'completado', date: '15 Jul 2026' },
        { label: 'Datos de facturación', status: 'en-progreso', date: '18 Jul 2026' },
        { label: 'Datos para obra social', status: 'pendiente', date: null },
        { label: 'Cursos obligatorios', status: 'pendiente', date: null },
        { label: 'Setup de bienvenida', status: 'entregado', date: '18 Jul 2026' },
      ],
    };
  }

  /** Generic-but-consistent detail for everyone else: only Valentina has bespoke
   * contact/PEC/kit data in the reference, so the rest derive a believable
   * equivalent from their status + completed-step count rather than 404-ing. */
  private deriveDetail(employee: Employee): EmployeeDetail {
    const steps: OnboardingStep[] = STEP_LABELS.map((label, index) => {
      if (index < employee.completedSteps) {
        const status: StepStatus = label === 'Setup de bienvenida' ? 'entregado' : 'completado';
        return { label, status, date: employee.joinDateLabel };
      }
      if (index === employee.completedSteps && employee.status === 'en-progreso') {
        return { label, status: 'en-progreso', date: employee.joinDateLabel };
      }
      return { label, status: 'pendiente', date: null };
    });

    const kitStage: KitStage =
      employee.status === 'completado' ? 'entregado' : employee.completedSteps >= 2 ? 'camino' : 'preparacion';

    const created = this.createdDetails.get(employee.id);

    return {
      ...employee,
      email: created?.email ?? emailFor(employee.name),
      phone: created?.phone ?? '+54 11 1234-5678',
      pec: created?.pec ?? DEFAULT_PEC,
      kit: {
        name: created?.kit.name ?? 'Kit Diseño',
        items: created?.kit.items ?? DEFAULT_KIT_ITEMS,
        stage: kitStage,
        dates: {
          preparacion: employee.joinDateLabel,
          camino: kitStage !== 'preparacion' ? employee.joinDateLabel : null,
          entregado: kitStage === 'entregado' ? employee.joinDateLabel : null,
        },
        deliveryAddress: DEFAULT_KIT_DELIVERY_ADDRESS,
      },
      steps,
    };
  }
}
