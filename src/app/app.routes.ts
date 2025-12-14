import { Routes } from '@angular/router';

import { authGuard } from './modules/auth/guards/auth.guard';
import { NotFoundPage } from './modules/pages/not-found-page/not-found-page/not-found-page';
import { HistoryComponent } from './modules/history/pages/history.component';
import historyRoutes from './modules/history/history.route';

export const routes: Routes = [
 
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'inicio',
  },

  {
    path: 'inicio',
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
    canActivate: [authGuard],
    loadChildren: () =>
      import('./modules/sales/sales.routes').then(m => m.salesRoutes),
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
    canActivate: [authGuard],
    loadChildren: () =>
      import('./modules/inventory/inventory.routes').then(
        m => m.inventoryRoutes,
      ),
  },

  {
    path: 'historial',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./modules/history/history.route').then(m => m.historyRoutes),
  },

  {
    path: 'estadisticas',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./modules/statistics/statistics.route').then(
        m => m.StatisticsRoutes, // o StatisticsRoutes si así se exporta
      ),
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
    redirectTo: 'inicio',
  },
];
