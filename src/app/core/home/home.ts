import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Sidenav } from '../sidenav/sidenav';
import { Navbar } from '../navbar/navbar';

type HomeTab =
  | 'login'
  | 'stock'
  | 'customers'
  | 'stats'
  | 'sales'
  | 'movements'
  | 'suppliers'
  | 'subs'
  | null;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, Sidenav, Navbar],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class HomeComponent {
  activeTab: HomeTab = 'login'; // por defecto

  selectTab(tab: Exclude<HomeTab, null>) {
    // click al activo = lo cierra (si no querés esto, borrá el ternario)
    this.activeTab = this.activeTab === tab ? null : tab;
  }

  tabLabel(tab: Exclude<HomeTab, null>): string {
    switch (tab) {
      case 'login': return 'Loguearse';
      case 'stock': return 'Control de stock';
      case 'customers': return 'Clientes';
      case 'stats': return 'Estadísticas';
      case 'sales': return 'Ventas';
      case 'movements': return 'Movimientos';
      case 'suppliers': return 'Proveedores';
      case 'subs': return 'Suscripciones';
    }
  }

  tabSubtitle(tab: Exclude<HomeTab, null>): string {
    switch (tab) {
      case 'login': return 'Acceso y perfiles';
      case 'stock': return 'Productos, precios y stock';
      case 'customers': return 'Alta y listado';
      case 'stats': return 'KPIs y gráficos';
      case 'sales': return 'Flujo de venta';
      case 'movements': return 'Historial de ventas';
      case 'suppliers': return 'Gestión proveedores';
      case 'subs': return 'Planes y tenants';
    }
  }
}
