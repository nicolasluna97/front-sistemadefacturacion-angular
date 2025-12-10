import { Routes } from '@angular/router';

import { authGuard } from './modules/auth/guards/auth.guard';

import { NotFoundPage } from './modules/pages/not-found-page/not-found-page/not-found-page';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./core/home/home').then(m => m.HomeComponent),
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./modules/auth/auth.routes').then(m => m.authRoutes),
  },
  {
    path: 'ventas',
    loadChildren: () =>
      import('./modules/sales/sales.routes').then(m => m.salesRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'cuenta',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./modules/account/pages/account-page').then(
        m => m.AccountPage,
      ),
  },
  {
    path: 'inventario',
    loadChildren: () =>
      import('./modules/inventory/inventory.routes').then(
        m => m.inventoryRoutes,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'historial',
    loadChildren: () =>
      import('./modules/history/history.route').then(m => m.historyRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'estadisticas',
    loadChildren: () =>
      import('./modules/statistics/statistics.route').then(
        m => m.StatisticsRoutes,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'clientes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./modules/customers/pages/customers-page').then(
        m => m.CustomersPage,
      ),
  },
  {
    path: '**',
    component: NotFoundPage,
  },
];
