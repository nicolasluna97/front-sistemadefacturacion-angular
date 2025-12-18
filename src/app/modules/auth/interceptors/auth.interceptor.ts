import { HttpInterceptorFn } from '@angular/common/http';

function readToken(): string | null {
  // Busca en varios keys comunes
  const raw =
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('access') ||
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('accessToken') ||
    sessionStorage.getItem('access_token') ||
    null;

  if (!raw) return null;

  // Por si guardaste algo tipo JSON: {"token":"..."}
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
    if (parsed?.token) return String(parsed.token);
    if (parsed?.accessToken) return String(parsed.accessToken);
    if (parsed?.access_token) return String(parsed.access_token);
  } catch {
    // si no es JSON, seguimos
  }

  return raw;
}

function isApiRequest(url: string): boolean {
  // Acepta:
  //  - /api/...
  //  - http://localhost:4200/api/...
  //  - http://localhost:3000/api/...
  try {
    const u = new URL(url, window.location.origin);
    return u.pathname.startsWith('/api/');
  } catch {
    // fallback raro, pero seguro
    return url.includes('/api/');
  }
}

function isAuthEndpoint(url: string): boolean {
  try {
    const u = new URL(url, window.location.origin);
    const path = u.pathname;

    return (
      path.startsWith('/api/auth/login') ||
      path.startsWith('/api/auth/register') ||
      path.startsWith('/api/auth/refresh')
    );
  } catch {
    return (
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/register') ||
      url.includes('/api/auth/refresh')
    );
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Solo API
  if (!isApiRequest(req.url)) return next(req);

  // No meter token en auth endpoints
  if (isAuthEndpoint(req.url)) return next(req);

  const token = readToken();
  if (!token) return next(req);

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
