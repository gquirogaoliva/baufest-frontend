import { Injectable } from '@angular/core';
import { Observable, throwError, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Backend isn't built yet. login() simulates network latency and always
 * rejects with "invalid credentials" so the error state is demonstrable.
 * Replace the body with a real HTTP call once the API exists.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  login(credentials: LoginCredentials): Observable<never> {
    return timer(900).pipe(
      switchMap(() => throwError(() => new Error('invalid-credentials')))
    );
  }
}
