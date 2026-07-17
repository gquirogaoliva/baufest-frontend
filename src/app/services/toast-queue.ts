import { Injectable, signal } from '@angular/core';

export interface QueuedToast {
  message: string;
  /** Id of the row the destination screen should visually highlight, if any. */
  highlightId?: string;
}

/** Hands a one-off toast message across a navigation — e.g. "employee created"
 * queued by the create form, shown by the list screen once it lands there. */
@Injectable({ providedIn: 'root' })
export class ToastQueueService {
  private readonly pending = signal<QueuedToast | null>(null);

  queue(message: string, highlightId?: string): void {
    this.pending.set({ message, highlightId });
  }

  /** Reads and clears the pending toast, if any. Call once on init. */
  consume(): QueuedToast | null {
    const value = this.pending();
    this.pending.set(null);
    return value;
  }
}
