import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { EmployeeDataService, EmployeeDetail as EmployeeDetailModel, KitStage, StepStatus } from '../../services/employee-data';
import { AppHeader } from '../../shared/app-header/app-header';
import { Toast } from '../../shared/toast/toast';

const KIT_STAGE_LABEL: Record<KitStage, string> = {
  preparacion: 'En preparación',
  camino: 'En camino',
  entregado: 'Entregado',
};

const STEP_BADGE_LABEL: Record<StepStatus, string> = {
  completado: 'Completado',
  entregado: 'Entregado',
  'en-progreso': 'En progreso',
  pendiente: 'Pendiente',
};

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatReminderTimestamp(date: Date): string {
  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  return `Recordatorio enviado el ${day} ${month} ${year} · ${hh}:${mm} hs`;
}

@Component({
  selector: 'app-employee-detail',
  imports: [AppHeader, RouterLink, Toast],
  templateUrl: './employee-detail.html',
  styleUrl: './employee-detail.scss',
})
export class EmployeeDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly employeeData = inject(EmployeeDataService);

  protected readonly detail = signal<EmployeeDetailModel | undefined>(undefined);
  protected readonly loading = signal(true);

  protected readonly completedCount = computed(
    () => this.detail()?.steps.filter((s) => s.status === 'completado' || s.status === 'entregado').length ?? 0,
  );

  protected readonly progressPercent = computed(() => {
    const detail = this.detail();
    return detail ? Math.round((this.completedCount() / detail.totalSteps) * 100) : 0;
  });

  protected readonly whatsappHref = computed(() => {
    const phone = this.detail()?.phone;
    return phone ? `https://wa.me/${phone.replace(/\D/g, '')}` : '';
  });

  protected readonly kitStages = computed<
    { key: KitStage; label: string; date: string | null; status: 'done' | 'active' | 'pending' }[]
  >(() => {
    const detail = this.detail();
    if (!detail) {
      return [];
    }
    const order: KitStage[] = ['preparacion', 'camino', 'entregado'];
    const currentIndex = order.indexOf(detail.kit.stage);
    // The terminal stage (entregado) reads as fully done, not "in progress" —
    // "active" only makes sense for an intermediate current stage.
    const isTerminal = currentIndex === order.length - 1;
    return order.map((key) => {
      const keyIndex = order.indexOf(key);
      const status =
        keyIndex < currentIndex || (keyIndex === currentIndex && isTerminal)
          ? 'done'
          : keyIndex === currentIndex
            ? 'active'
            : 'pending';
      return { key, label: KIT_STAGE_LABEL[key], date: detail.kit.dates[key], status };
    });
  });

  // Onboarding fully done (status 'completado') means every step reads as
  // finished from the employee's side too, even the ones tagged 'entregado' —
  // sending a "pasos pendientes" reminder to someone who's 100% done doesn't
  // make sense, so the action is unavailable rather than showing a misleading list.
  protected readonly canSendReminder = computed(() => this.detail()?.status !== 'completado');

  protected readonly pendingStepsForReminder = computed(() => {
    const detail = this.detail();
    return detail && this.canSendReminder() ? detail.steps.filter((s) => s.status !== 'completado') : [];
  });

  protected readonly showReminderModal = signal(false);
  protected readonly reminderJustSent = signal(false);

  private readonly reminderHistory = signal<Date[]>([]);
  protected readonly visibleReminderHistory = computed(() =>
    this.reminderHistory().slice(0, 3).map(formatReminderTimestamp),
  );

  private reminderResetTimeoutId: ReturnType<typeof setTimeout> | undefined;

  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('reminderDialog');

  constructor() {
    effect(() => {
      const dialog = this.dialogRef()?.nativeElement;
      if (!dialog) {
        return;
      }
      if (this.showReminderModal() && !dialog.open) {
        dialog.showModal();
      } else if (!this.showReminderModal() && dialog.open) {
        dialog.close();
      }
    });

    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.employeeData.getById(id).subscribe((detail) => {
      this.detail.set(detail);
      this.loading.set(false);
    });
  }

  kitStageLabel(stage: KitStage): string {
    return KIT_STAGE_LABEL[stage];
  }

  stepBadgeLabel(status: StepStatus): string {
    return STEP_BADGE_LABEL[status];
  }

  openReminderModal(): void {
    this.showReminderModal.set(true);
  }

  closeReminderModal(): void {
    this.showReminderModal.set(false);
  }

  onDialogBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogRef()?.nativeElement) {
      this.closeReminderModal();
    }
  }

  sendReminder(): void {
    const detail = this.detail();
    if (!detail) {
      return;
    }

    this.showReminderModal.set(false);
    this.employeeData.sendReminder(detail.email, detail.name).subscribe();
    this.reminderHistory.update((history) => [new Date(), ...history]);

    this.reminderJustSent.set(true);
    clearTimeout(this.reminderResetTimeoutId);
    this.reminderResetTimeoutId = setTimeout(() => this.reminderJustSent.set(false), 3000);
  }
}
