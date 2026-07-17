import { Component, ElementRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly passwordVisible = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly submitted = signal(false);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.submitted.set(true);
      this.form.markAllAsTouched();
      // Deferred so Angular finishes reflecting the new aria-invalid state
      // in the DOM before we query for it.
      setTimeout(() => this.focusFirstInvalidField());
      return;
    }

    this.submitError.set(null);
    this.isSubmitting.set(true);

    const { email, password } = this.form.getRawValue();

    this.authService.login({ email: email ?? '', password: password ?? '' }).subscribe({
      error: () => {
        this.isSubmitting.set(false);
        this.submitError.set('Email o contraseña incorrectos. Intentá de nuevo.');
      },
      complete: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/dashboard']);
      },
    });
  }

  private focusFirstInvalidField(): void {
    const firstInvalid = this.elementRef.nativeElement.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    );
    firstInvalid?.focus();
  }
}
