import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { EmployeeDataService, KitStage } from '../../services/employee-data';

type StepKey =
  | 'bienvenida'
  | 'datos-personales'
  | 'datos-facturacion'
  | 'datos-obra-social'
  | 'cursos'
  | 'setup-bienvenida';

interface StepDef {
  key: StepKey;
  label: string;
}

const STEPS: StepDef[] = [
  { key: 'bienvenida', label: 'Bienvenida' },
  { key: 'datos-personales', label: 'Datos personales' },
  { key: 'datos-facturacion', label: 'Datos de facturación' },
  { key: 'datos-obra-social', label: 'Datos para obra social' },
  { key: 'cursos', label: 'Cursos obligatorios' },
  { key: 'setup-bienvenida', label: 'Setup de bienvenida' },
];

const KIT_STAGE_LABEL: Record<KitStage, string> = {
  preparacion: 'En preparación',
  camino: 'En camino',
  entregado: 'Entregado',
};

const TAX_CONDITION_OPTIONS = ['Relación de dependencia', 'Monotributista', 'Otro'];
const ACCOUNT_TYPE_OPTIONS = ['Caja de ahorro', 'Cuenta corriente'];
const HEALTH_INSURANCE_OPTIONS = ['OSDE', 'Swiss Medical', 'Galeno', 'Medifé', 'IOMA'];
const RELATIONSHIP_OPTIONS = ['Cónyuge', 'Hijo/a', 'Padre', 'Madre', 'Otro'];

const PHONE_PATTERN = /^[+\d][\d\s()-]{5,}$/;

const RRHH_WHATSAPP_HREF = 'https://wa.me/5491112345678';
const RRHH_MAIL_HREF = 'mailto:rrhh@baufest.com';

interface FamilyMember {
  name: string;
  relationship: string;
  birthDate: string;
}

interface DocumentUpload {
  key: string;
  label: string;
  uploaded: boolean;
}

interface Course {
  key: string;
  name: string;
  description: string;
  url: string;
  checked: boolean;
}

const DOCUMENT_DEFS: { key: string; label: string }[] = [
  { key: 'dni-frente', label: 'DNI frente' },
  { key: 'dni-dorso', label: 'DNI dorso' },
  { key: 'partidas-nacimiento', label: 'Partidas de nacimiento' },
];

const COURSE_DEFS: { key: string; name: string; description: string }[] = [
  { key: 'seguridad-informacion', name: 'Seguridad de la información', description: 'Buenas prácticas para proteger datos propios y de clientes.' },
  { key: 'codigo-conducta', name: 'Código de conducta', description: 'Principios éticos y de comportamiento dentro de Baufest.' },
  { key: 'prevencion-riesgos', name: 'Prevención de riesgos laborales', description: 'Normas de higiene y seguridad en el trabajo.' },
  { key: 'diversidad-inclusion', name: 'Diversidad e inclusión', description: 'Cómo construimos un ambiente de trabajo inclusivo.' },
];

@Component({
  selector: 'app-onboarding',
  imports: [ReactiveFormsModule],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.scss',
})
export class Onboarding {
  private readonly route = inject(ActivatedRoute);
  private readonly employeeData = inject(EmployeeDataService);
  private readonly fb = inject(FormBuilder);

  protected readonly steps = STEPS;
  protected readonly taxConditionOptions = TAX_CONDITION_OPTIONS;
  protected readonly accountTypeOptions = ACCOUNT_TYPE_OPTIONS;
  protected readonly healthInsuranceOptions = HEALTH_INSURANCE_OPTIONS;
  protected readonly relationshipOptions = RELATIONSHIP_OPTIONS;

  protected readonly detail = this.employeeData.getById(this.route.snapshot.paramMap.get('token') ?? '');

  protected readonly rrhhWhatsappHref = RRHH_WHATSAPP_HREF;
  protected readonly rrhhMailHref = RRHH_MAIL_HREF;

  protected readonly firstName = computed(() => this.detail?.name.trim().split(/\s+/)[0] ?? '');

  protected readonly activeStepKey = signal<StepKey>('bienvenida');

  private readonly initiallyCompleted = new Set<StepKey>(
    (this.detail?.steps ?? [])
      .filter((s) => s.status === 'completado' || s.status === 'entregado')
      .map((s) => this.keyForLabel(s.label))
      .filter((k): k is StepKey => k !== null),
  );

  protected readonly completedSteps = signal<Set<StepKey>>(new Set(this.initiallyCompleted));

  protected readonly sidebarSteps = computed(() => {
    const active = this.activeStepKey();
    const completed = this.completedSteps();
    return STEPS.map((step) => ({
      ...step,
      state: step.key === active ? ('activo' as const) : completed.has(step.key) ? ('completado' as const) : ('pendiente' as const),
    }));
  });

  protected readonly completedCount = computed(() => this.completedSteps().size);
  protected readonly progressPercent = computed(() => Math.round((this.completedCount() / STEPS.length) * 100));

  // Step 2 — Datos personales
  protected readonly personalDataForm = this.fb.group({
    dni: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
    birthDate: ['', [Validators.required]],
    address: ['', [Validators.required]],
    personalPhone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    emergencyContactName: ['', [Validators.required]],
    emergencyContactPhone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
  });
  protected readonly personalDataSubmitted = signal(false);

  // Step 3 — Datos de facturación
  protected readonly billingForm = this.fb.group({
    cuil: ['', [Validators.required, Validators.pattern(/^\d{2}-?\d{7,8}-?\d$/)]],
    taxCondition: ['', [Validators.required]],
    cbu: ['', [Validators.required, Validators.pattern(/^\d{22}$/)]],
    bank: ['', [Validators.required]],
    accountType: ['', [Validators.required]],
  });
  protected readonly billingSubmitted = signal(false);

  // Step 4 — Datos para obra social
  protected readonly healthForm = this.fb.group({
    healthInsurance: ['', [Validators.required]],
  });
  protected readonly healthSubmitted = signal(false);

  protected readonly familyMembers = signal<FamilyMember[]>([]);
  protected readonly newFamilyMemberName = signal('');
  protected readonly newFamilyMemberRelationship = signal('');
  protected readonly newFamilyMemberBirthDate = signal('');

  protected readonly documents = signal<DocumentUpload[]>(DOCUMENT_DEFS.map((d) => ({ ...d, uploaded: false })));

  // Step 5 — Cursos obligatorios
  protected readonly courses = signal<Course[]>(
    COURSE_DEFS.map((c) => ({ ...c, url: 'https://cursos.baufest.com/' + c.key, checked: false })),
  );
  protected readonly allCoursesChecked = computed(() => this.courses().every((c) => c.checked));

  // Step 6 — Setup de bienvenida
  protected readonly kitStages = computed(() => {
    const kit = this.detail?.kit;
    if (!kit) {
      return [];
    }
    const order: KitStage[] = ['preparacion', 'camino', 'entregado'];
    const currentIndex = order.indexOf(kit.stage);
    const isTerminal = currentIndex === order.length - 1;
    return order.map((key) => {
      const keyIndex = order.indexOf(key);
      const status =
        keyIndex < currentIndex || (keyIndex === currentIndex && isTerminal)
          ? 'done'
          : keyIndex === currentIndex
            ? 'active'
            : 'pending';
      return { key, label: KIT_STAGE_LABEL[key], date: kit.dates[key], status };
    });
  });

  protected readonly allPriorStepsCompleted = computed(() =>
    STEPS.filter((s) => s.key !== 'setup-bienvenida').every((s) => this.completedSteps().has(s.key)),
  );

  protected readonly onboardingFinished = signal(false);

  private keyForLabel(label: string): StepKey | null {
    const found = STEPS.find((s) => s.label === label);
    return found ? found.key : null;
  }

  goToStep(key: StepKey): void {
    this.activeStepKey.set(key);
  }

  private markCompleteAndAdvance(key: StepKey): void {
    this.completedSteps.update((set) => new Set(set).add(key));
    const index = STEPS.findIndex((s) => s.key === key);
    const next = STEPS[index + 1];
    if (next) {
      this.activeStepKey.set(next.key);
    }
  }

  continueFromWelcome(): void {
    this.markCompleteAndAdvance('bienvenida');
  }

  submitPersonalData(): void {
    if (this.personalDataForm.invalid) {
      this.personalDataSubmitted.set(true);
      this.personalDataForm.markAllAsTouched();
      return;
    }
    this.markCompleteAndAdvance('datos-personales');
  }

  submitBilling(): void {
    if (this.billingForm.invalid) {
      this.billingSubmitted.set(true);
      this.billingForm.markAllAsTouched();
      return;
    }
    this.markCompleteAndAdvance('datos-facturacion');
  }

  onNewFamilyMemberNameInput(event: Event): void {
    this.newFamilyMemberName.set((event.target as HTMLInputElement).value);
  }

  onNewFamilyMemberRelationshipChange(event: Event): void {
    this.newFamilyMemberRelationship.set((event.target as HTMLSelectElement).value);
  }

  onNewFamilyMemberBirthDateInput(event: Event): void {
    this.newFamilyMemberBirthDate.set((event.target as HTMLInputElement).value);
  }

  addFamilyMember(): void {
    const name = this.newFamilyMemberName().trim();
    const relationship = this.newFamilyMemberRelationship();
    const birthDate = this.newFamilyMemberBirthDate();
    if (!name || !relationship || !birthDate) {
      return;
    }
    this.familyMembers.update((members) => [...members, { name, relationship, birthDate }]);
    this.newFamilyMemberName.set('');
    this.newFamilyMemberRelationship.set('');
    this.newFamilyMemberBirthDate.set('');
  }

  removeFamilyMember(index: number): void {
    this.familyMembers.update((members) => members.filter((_, i) => i !== index));
  }

  uploadDocument(key: string): void {
    this.documents.update((docs) => docs.map((d) => (d.key === key ? { ...d, uploaded: true } : d)));
  }

  submitHealthInsurance(): void {
    if (this.healthForm.invalid) {
      this.healthSubmitted.set(true);
      this.healthForm.markAllAsTouched();
      return;
    }
    this.markCompleteAndAdvance('datos-obra-social');
  }

  toggleCourse(key: string): void {
    this.courses.update((courses) => courses.map((c) => (c.key === key ? { ...c, checked: !c.checked } : c)));
  }

  submitCourses(): void {
    if (!this.allCoursesChecked()) {
      return;
    }
    this.markCompleteAndAdvance('cursos');
  }

  finishOnboarding(): void {
    if (!this.allPriorStepsCompleted()) {
      return;
    }
    this.completedSteps.update((set) => new Set(set).add('setup-bienvenida'));
    this.onboardingFinished.set(true);
  }
}
