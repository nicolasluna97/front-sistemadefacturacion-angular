import { authGuard } from './modules/auth/guards/auth.guard';
import { Routes } from '@angular/router';
import { HomeComponent } from './core/home/home';
import { InventoryPages } from './modules/inventory/pages/inventory-pages';
import { SalesComponent } from './modules/sales/pages/sales.component';
import { NotFoundPage } from './modules/pages/not-found-page/not-found-page/not-found-page';

export const routes: Routes = [

 
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.routes').then(m => m.authRoutes)
  },

  
  {
    path: '',
    component: HomeComponent,
  
  },

  {
    path: 'home',
    redirectTo: '',
    pathMatch: 'full'
  },

  
  {
    path: 'ventas',
    loadChildren: () => import('./modules/sales/sales.routes').then(m => m.salesRoutes),
    canActivate: [authGuard]
  },
  {
    path: 'inventario',
    loadChildren: () => import('./modules/inventory/inventory.routes').then(m => m.inventoryRoutes),
    canActivate: [authGuard]
  },
  {
    path: 'historial',
    loadChildren: () => import('./modules/history/history.route').then(m => m.historyRoutes),
    canActivate: [authGuard]
  },
  {
    path: 'estadisticas',
    loadChildren: () => import('./modules/statistics/statistics.route').then(m => m.StatisticsRoutes),
    canActivate: [authGuard]
  },

 
  {
    path: '**',
    component: NotFoundPage,
  },
];
