import { Injectable } from '@angular/core';
import { Observable, of, throwError, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface LoginCredentials {
  email: string;
  password: string;
}

// Credenciales de demo (RRHH) para probar el flujo de login mientras no
// existe backend. Quitar junto con DEMO_CREDENTIALS cuando se integre la API real.
const DEMO_CREDENTIALS: LoginCredentials = {
  email: 'melina.casagrande@baufest.com',
  password: 'demo1234',
};

/**
 * Backend isn't built yet. login() simulates network latency and resolves
 * successfully only for DEMO_CREDENTIALS; any other input rejects with
 * "invalid credentials" so the error state is demonstrable.
 * Replace the body with a real HTTP call once the API exists.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  login(credentials: LoginCredentials): Observable<void> {
    const isDemoMatch =
      credentials.email === DEMO_CREDENTIALS.email &&
      credentials.password === DEMO_CREDENTIALS.password;

    return timer(900).pipe(
      switchMap(() =>
        isDemoMatch ? of(undefined) : throwError(() => new Error('invalid-credentials'))
      )
    );
  }
}
