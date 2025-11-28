import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { User } from '../interfaces/user.interface';
import { AuthResponse } from '../interfaces/auth-response.interface';

type AuthStatus = 'checking' | 'authenticated' | 'not-authenticated';
type LoginOutcome = 'ok' | 'wrong-password' | 'user-not-found' | 'db-connection' | 'unknown';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private _authStatus = signal<AuthStatus>('checking');
  private _user = signal<User | null>(null);
  private _token = signal<string | null>(null);
  private http = inject(HttpClient);

  // Si más adelante usás proxy, podés cambiar esto a '/api'
  private baseUrl = 'http://localhost:3000/api';

  constructor() {
    console.log('🎯 AuthService initialized with URL:', this.baseUrl);
    this.checkAuthStatus();
  }

  // ====== Getters útiles (opcionales para la UI) ======
  get authStatus() { return this._authStatus; }
  get user() { return this._user; }
  get token() { return this._token; }

  isAuthenticated(): boolean {
    return this._authStatus() === 'authenticated';
  }

  // Al iniciar la app, solo miramos si hay token (simple)
  private checkAuthStatus(): void {
    const token = localStorage.getItem('token');
    if (token) {
      this._token.set(token);
      this._authStatus.set('authenticated');
    } else {
      this._authStatus.set('not-authenticated');
    }
  }

  getToken(): string | null {
    return this._token();
  }

  logout(): void {
    this._user.set(null);
    this._token.set(null);
    this._authStatus.set('not-authenticated');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }

  // =====================================================
  // LOGIN SIMPLE (boolean)
  // =====================================================
  login(email: string, password: string): Observable<boolean> {
    const url = `${this.baseUrl}/auth/login`;

    console.log('🚀 === MAKING LOGIN REQUEST ===');
    console.log('🚀 URL:', url);
    console.log('🚀 Email:', email);

    return this.http.post<AuthResponse>(url, {
      email: email,
      password: password
    })
      .pipe(
        tap((resp) => {
          console.log('✅ Login successful!');
          this._user.set(resp.user);
          this._authStatus.set('authenticated');
          this._token.set(resp.token);
          localStorage.setItem('token', resp.token);
          localStorage.setItem('refreshToken', resp.refreshToken);
        }),
        map(() => true),
        catchError((error: any) => {
          console.error('❌ Login failed');
          console.error('❌ Error status:', error.status);
          console.error('❌ Error URL:', error.url);
          this._user.set(null);
          this._token.set(null);
          this._authStatus.set('not-authenticated');
          return of(false);
        })
      );
  }

  // =====================================================
  // REGISTER (ahora SOLO crea usuario y envía código)
  // NO guarda tokens ni marca authenticated
  // =====================================================
  register(dto: { fullName: string; email: string; password: string }): Observable<boolean> {
    const url = `${this.baseUrl}/auth/register`;

    console.log('📝 Register request:', dto);

    return this.http.post<any>(url, dto).pipe(
      tap((resp) => {
        console.log('✅ Usuario creado, backend dice:', resp);
        // resp = { ok: true, message: 'Usuario creado. Se envió un código...' }
        // NO guardamos tokens ni usuario aquí
      }),
      map(() => true),
      catchError((error) => {
        console.error('❌ Error en register', error);
        return of(false);
      })
    );
  }

  // =====================================================
  // NUEVO: VERIFY EMAIL (email + código de 6 dígitos)
  // Si todo ok, guarda tokens y marca authenticated
  // =====================================================
  verifyEmail(email: string, code: string): Observable<boolean> {
    const url = `${this.baseUrl}/auth/verify-email`;

    console.log('📩 Verifying email with code:', { email, code });

    return this.http.post<any>(url, { email, code }).pipe(
      tap((resp: any) => {
        console.log('✅ Email verificado, respuesta backend:', resp);

        // resp tiene: id, email, fullName, isActive, roles, token, refreshToken
        const user: User = {
          // Ajustá estos campos si tu interfaz User tiene otros nombres
          id: resp.id,
          email: resp.email,
          fullName: resp.fullName,
          roles: resp.roles,
          isActive: resp.isActive,
        } as User;

        this._user.set(user);
        this._authStatus.set('authenticated');
        this._token.set(resp.token);

        localStorage.setItem('token', resp.token);
        localStorage.setItem('refreshToken', resp.refreshToken);
      }),
      map(() => true),
      catchError((error) => {
        console.error('❌ Error verificando email', error);
        return of(false);
      })
    );
  }

  // =====================================================
  // NUEVO: RESEND CODE (reenvía código de verificación)
  // =====================================================
  resendVerificationCode(email: string): Observable<boolean> {
    const url = `${this.baseUrl}/auth/resend-code`;

    console.log('🔁 Resending verification code to:', email);

    return this.http.post<any>(url, { email }).pipe(
      tap((resp) => {
        console.log('✅ Código reenviado, respuesta backend:', resp);
      }),
      map(() => true),
      catchError((error) => {
        console.error('❌ Error reenviando código', error);
        return of(false);
      })
    );
  }

  // =====================================================
  // LOGIN con resultado tipado para mostrar mensajes
  // =====================================================
  loginDetailed(
    email: string,
    password: string
  ): Observable<LoginOutcome> {

    const url = `${this.baseUrl}/auth/login`;

    console.log('🚀 === MAKING LOGIN REQUEST (detailed) ===');
    console.log('🚀 URL:', url);
    console.log('🚀 Email:', email);

    return this.http.post<AuthResponse>(url, { email, password }).pipe(
      tap((resp) => {
        console.log('✅ Login successful (detailed)!');
        this._user.set(resp.user);
        this._authStatus.set('authenticated');
        this._token.set(resp.token);
        localStorage.setItem('token', resp.token);
        localStorage.setItem('refreshToken', resp.refreshToken);
      }),
      map(() => 'ok' as const),
      catchError((error: any) => {
        console.error('❌ Login failed (detailed)');
        console.error('❌ Error status:', error?.status);
        console.error('❌ Error URL:', error?.url);

        this._user.set(null);
        this._token.set(null);
        this._authStatus.set('not-authenticated');

        const rawMsg = error?.error?.message;
        const msg = Array.isArray(rawMsg)
          ? rawMsg.join(' ').toLowerCase()
          : (typeof rawMsg === 'string' ? rawMsg.toLowerCase() : '');

        const code = (error?.error?.code || '').toString().toLowerCase();

        if (msg.includes('credentials') && msg.includes('password')) return of('wrong-password' as const);
        if (msg.includes('credentials') && msg.includes('email'))    return of('user-not-found' as const);
        if (msg.includes('wrong_password') || code.includes('wrong_password') || code.includes('invalid_credentials')) {
          return of('wrong-password' as const);
        }
        if (msg.includes('user not found') || code.includes('user_not_found')) {
          return of('user-not-found' as const);
        }

        if (error?.status === 404) return of('user-not-found' as const);
        if (error?.status === 401) return of('wrong-password' as const);
        if (error?.status === 0 || (error?.status >= 500 && error?.status < 600)) {
          return of('db-connection' as const);
        }

        if (error?.status === 400 && msg.includes('credentials')) return of('wrong-password' as const);

        return of('unknown' as const);
      })
    );
  }

  // =====================================================
  // REFRESH TOKEN (ya lo tenías, casi igual)
  // =====================================================
  refreshToken(): Observable<{ token: string; refreshToken: string }> {
    const url = `${this.baseUrl}/auth/refresh`;
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      console.warn('❌ No refresh token found in localStorage');
      return throwError(() => new Error('No refresh token found'));
    }

    console.log('🔁 Requesting refresh token...');

    return this.http.post<{ token: string; refreshToken: string }>(
      url,
      { refreshToken },
    ).pipe(
      tap((resp) => {
        console.log('✅ Token refreshed successfully');
        localStorage.setItem('token', resp.token);
        localStorage.setItem('refreshToken', resp.refreshToken);
        this._token.set(resp.token);
      })
    );
  }

}
