import { Component, ElementRef, afterNextRender, inject, input } from '@angular/core';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
  host: { tabindex: '-1' },
})
export class Toast {
  readonly message = input.required<string>();

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    // Moves focus to the announcement so keyboard/AT users aren't left on a
    // control that just went disabled (e.g. a submit button mid-success-state).
    // Not part of the tab sequence (tabindex=-1) — this is a one-time
    // programmatic focus, not an interactive affordance.
    afterNextRender(() => {
      this.elementRef.nativeElement.focus({ preventScroll: true });
    });
  }
}
