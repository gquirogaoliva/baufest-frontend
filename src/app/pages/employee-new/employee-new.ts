import { Component, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { EmployeeDataService } from '../../services/employee-data';
import { ToastQueueService } from '../../services/toast-queue';
import { AppHeader } from '../../shared/app-header/app-header';

interface PecOption {
  name: string;
  role: string;
}

interface KitOption {
  name: string;
  description: string;
  items: string[];
}

interface KitItem {
  label: string;
  checked: boolean;
}

const ROLE_OPTIONS = [
  'UX Designer',
  'Backend Developer',
  'Frontend Developer',
  'Product Manager',
  'Data Scientist',
  'QA Engineer',
  'DevOps Engineer',
  'Tech Lead',
  'Engineering Manager',
  'Project Manager',
];

const AREA_OPTIONS = [
  'AI Digital Products',
  'Ingeniería',
  'Producto',
  'Analytics',
  'Calidad',
  'Cloud & DevOps',
  'Delivery',
  'Data',
];

const PEC_OPTIONS: PecOption[] = [
  { name: 'Guadalupe Quiroga Oliva', role: 'Engineering Manager' },
  { name: 'Melina Casagrande', role: 'RRHH Baufest' },
  { name: 'Martín Rodríguez', role: 'Tech Lead' },
  { name: 'Ana Gómez', role: 'Product Manager' },
  { name: 'Carlos Fernández', role: 'Data Lead' },
];

const KIT_OPTIONS: KitOption[] = [
  {
    name: 'Kit Diseño',
    description: 'MacBook Pro, Mouse Magic, AirPods Pro, Merch Baufest.',
    items: ['MacBook Pro', 'Mouse Magic', 'AirPods Pro', 'Merch Baufest'],
  },
  {
    name: 'Kit Desarrollo',
    description: 'ThinkPad X1 Carbon, Mouse Logitech MX, Auriculares Sony WH-1000XM5, Merch Baufest.',
    items: ['ThinkPad X1 Carbon', 'Mouse Logitech MX', 'Auriculares Sony WH-1000XM5', 'Merch Baufest'],
  },
  {
    name: 'Kit Management',
    description: 'MacBook Air, Mouse Magic, AirPods, Merch Baufest.',
    items: ['MacBook Air', 'Mouse Magic', 'AirPods', 'Merch Baufest'],
  },
  {
    name: 'Kit Data / Analytics',
    description: 'ThinkPad X1, Mouse Logitech MX, Auriculares Sony, Merch Baufest.',
    items: ['ThinkPad X1', 'Mouse Logitech MX', 'Auriculares Sony', 'Merch Baufest'],
  },
  {
    name: 'Kit Default',
    description: 'Ingresá los items manualmente después de seleccionar.',
    items: [],
  },
];

@Component({
  selector: 'app-employee-new',
  imports: [ReactiveFormsModule, AppHeader],
  templateUrl: './employee-new.html',
  styleUrl: './employee-new.scss',
})
export class EmployeeNew {
  private readonly fb = inject(FormBuilder);
  private readonly employeeData = inject(EmployeeDataService);
  private readonly toastQueue = inject(ToastQueueService);
  private readonly router = inject(Router);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly roles = ROLE_OPTIONS;
  protected readonly areas = AREA_OPTIONS;
  protected readonly kitOptions = KIT_OPTIONS;

  protected readonly form = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.pattern(/^[^\s@]+@baufest\.com$/i)]],
    phone: ['', [Validators.required, Validators.pattern(/^[+\d][\d\s()-]{5,}$/)]],
    role: ['', [Validators.required]],
    area: ['', [Validators.required]],
    pec: this.fb.control<PecOption | null>(null, [Validators.required]),
    kitName: this.fb.control<string | null>(null, [Validators.required]),
  });

  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected readonly pecOpen = signal(false);
  protected readonly pecQuery = signal('');
  protected readonly pecActiveIndex = signal(0);
  protected readonly filteredPecOptions = computed(() => {
    const query = this.pecQuery().trim().toLowerCase();
    if (!query) {
      return PEC_OPTIONS;
    }
    return PEC_OPTIONS.filter(
      (pec) => pec.name.toLowerCase().includes(query) || pec.role.toLowerCase().includes(query),
    );
  });

  protected readonly kitOpen = signal(false);
  protected readonly kitActiveIndex = signal(0);
  protected readonly kitItems = signal<KitItem[]>([]);
  protected readonly newKitItemLabel = signal('');

  protected readonly mailPreviewOpen = signal(true);

  protected readonly firstName = computed(() => this.form.controls.name.value?.trim().split(/\s+/)[0] || null);

  private readonly pecWrapper = viewChild<ElementRef<HTMLElement>>('pecWrapper');
  private readonly kitWrapper = viewChild<ElementRef<HTMLElement>>('kitWrapper');

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node;
    if (this.pecOpen() && !this.pecWrapper()?.nativeElement.contains(target)) {
      this.pecOpen.set(false);
    }
    if (this.kitOpen() && !this.kitWrapper()?.nativeElement.contains(target)) {
      this.kitOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.pecOpen.set(false);
    this.kitOpen.set(false);
  }

  onPecFocus(): void {
    if (this.form.controls.pec.value) {
      this.pecQuery.set('');
    }
    this.pecOpen.set(true);
    this.pecActiveIndex.set(0);
    this.kitOpen.set(false);
  }

  pecDisplayValue(): string {
    if (this.pecOpen()) {
      return this.pecQuery();
    }
    const selected = this.form.controls.pec.value;
    return selected ? `${selected.name} — ${selected.role}` : '';
  }

  onPecQueryInput(event: Event): void {
    this.pecQuery.set((event.target as HTMLInputElement).value);
    this.pecActiveIndex.set(0);
    if (!this.pecOpen()) {
      this.pecOpen.set(true);
    }
  }

  onPecKeydown(event: KeyboardEvent): void {
    const options = this.filteredPecOptions();
    if (!this.pecOpen() || !options.length) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.pecActiveIndex.update((i) => Math.min(i + 1, options.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.pecActiveIndex.update((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const active = options[this.pecActiveIndex()];
      if (active) {
        this.selectPec(active);
      }
    }
  }

  selectPec(pec: PecOption): void {
    this.form.controls.pec.setValue(pec);
    this.pecOpen.set(false);
  }

  clearPec(event: Event): void {
    event.stopPropagation();
    this.form.controls.pec.setValue(null);
    this.pecQuery.set('');
  }

  toggleKit(): void {
    this.kitOpen.update((open) => !open);
    if (!this.kitOpen()) {
      return;
    }
    this.kitActiveIndex.set(Math.max(this.kitOptions.findIndex((k) => k.name === this.form.controls.kitName.value), 0));
    this.pecOpen.set(false);
  }

  onKitKeydown(event: KeyboardEvent): void {
    if (!this.kitOpen()) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.toggleKit();
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.kitActiveIndex.update((i) => Math.min(i + 1, this.kitOptions.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.kitActiveIndex.update((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const active = this.kitOptions[this.kitActiveIndex()];
      if (active) {
        this.selectKit(active);
      }
    }
  }

  selectKit(kit: KitOption): void {
    this.form.controls.kitName.setValue(kit.name);
    this.kitItems.set(kit.items.map((label) => ({ label, checked: true })));
    this.kitOpen.set(false);
  }

  clearKit(event: Event): void {
    event.stopPropagation();
    this.form.controls.kitName.setValue(null);
    this.kitItems.set([]);
  }

  toggleKitItem(index: number): void {
    this.kitItems.update((items) => items.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item)));
  }

  removeKitItem(index: number): void {
    this.kitItems.update((items) => items.filter((_, i) => i !== index));
  }

  onNewKitItemInput(event: Event): void {
    this.newKitItemLabel.set((event.target as HTMLInputElement).value);
  }

  addKitItem(): void {
    const label = this.newKitItemLabel().trim();
    if (!label) {
      return;
    }
    this.kitItems.update((items) => [...items, { label, checked: true }]);
    this.newKitItemLabel.set('');
  }

  toggleMailPreview(): void {
    this.mailPreviewOpen.update((open) => !open);
  }

  onSubmit(): void {
    if (this.submitting()) {
      return;
    }

    if (this.form.invalid) {
      this.submitted.set(true);
      this.form.markAllAsTouched();
      // Deferred so Angular finishes reflecting the new aria-invalid state
      // in the DOM before we query for it.
      setTimeout(() => this.focusFirstInvalidField());
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    const { name, email, phone, role, area, pec, kitName } = this.form.getRawValue();
    const trimmedEmail = email!.trim();

    this.employeeData
      .createEmployee({
        name: name!.trim(),
        email: trimmedEmail,
        phone: phone!.trim(),
        role: role!,
        area: area!,
        pec: pec!,
        kitName: kitName!,
        kitItems: this.kitItems()
          .filter((item) => item.checked)
          .map((item) => item.label),
      })
      .subscribe({
        next: (employee) => {
          this.toastQueue.queue(`Empleado registrado. Se envió el mail de bienvenida a ${trimmedEmail}`, employee.id);
          this.router.navigateByUrl('/empleados');
        },
        error: () => {
          this.submitting.set(false);
          this.submitError.set('No se pudo registrar el empleado. Intentá de nuevo.');
        },
      });
  }

  private focusFirstInvalidField(): void {
    const firstInvalid = this.elementRef.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]');
    firstInvalid?.focus();
  }
}
