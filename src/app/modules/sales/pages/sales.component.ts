// src/app/modules/sales/pages/sales.component.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';

import { Navbar } from 'src/app/core/navbar/navbar';
import { Sidenav } from 'src/app/core/sidenav/sidenav';

// IMPORTS CORRECTOS (los tuyos)
import {
  ProductsService,
  Product,
} from 'src/app/modules/products/services/products.service';

import { CustomersService } from '../../customers/services/customers.service';
import { CustomerModel } from '../../../core/models/customers';
import { forkJoin } from 'rxjs';


type Step = 'customer' | 'select' | 'configure' | 'summary' | 'done';
type PriceKey = 'price1' | 'price2' | 'price3' | 'price4';

interface SaleLine {
  productId: string;
  name: string;
  stockAvailable: number;
  price1: number;
  price2: number;
  price3: number;
  price4: number;
  quantity: number;
  selectedPriceKey: PriceKey;
}

@Component({
  standalone: true,
  selector: 'app-sales',
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.css'],
  imports: [CommonModule, Navbar, Sidenav, RouterModule],
})
export class SalesComponent implements OnInit {
  private productsSvc = inject(ProductsService);
  private customersSvc = inject(CustomersService);
  private router = inject(Router);

  step = signal<Step>('customer');

  // ===== CLIENTES =====
  customers = signal<CustomerModel[]>([]);
  loadingCustomers = signal(false);
  customersError = signal<string | null>(null);

  selectedCustomer = signal<CustomerModel | null>(null);
  customerError = signal(false);

  // ===== PRODUCTOS =====
  products = signal<Product[]>([]);
  loadingProducts = signal(false);
  loadError = signal<string | null>(null);
  saleError = signal<string | null>(null);

  // ===== SELECCIÓN / LÍNEAS =====
  selectedIds = signal<Set<string>>(new Set());
  quantityError = signal(false);

  lines = signal<SaleLine[]>([]);
  noStockError = signal<string | null>(null);

  total = computed(() =>
    this.lines().reduce((sum, line) => sum + this.getLineTotal(line), 0),
  );

  ngOnInit(): void {
    this.loadCustomers();
    this.loadProducts();
  }

  // ========== CARGA DE CLIENTES ==========
  loadCustomers() {
    this.loadingCustomers.set(true);
    this.customersError.set(null);

    this.customersSvc.getAll().subscribe({
      next: (items: CustomerModel[]) => {
        this.customers.set(items);
        this.loadingCustomers.set(false);
      },
      error: (err: any) => {
        const msg =
          err?.error?.message ||
          err?.message ||
          'No se pudieron cargar los clientes.';
        this.customersError.set(String(msg));
        this.loadingCustomers.set(false);
      },
    });
  }

  selectCustomer(c: CustomerModel) {
    this.selectedCustomer.set(c);
    this.customerError.set(false);
    this.step.set('select');
  }

  // ========== CARGA DE PRODUCTOS ==========
  loadProducts() {
    this.loadingProducts.set(true);
    this.loadError.set(null);

    this.productsSvc.getProducts().subscribe({
      next: (items: Product[]) => {
        this.products.set(items);
        this.loadingProducts.set(false);
      },
      error: (err: any) => {
        const msg =
          err?.error?.message ||
          err?.message ||
          'No se pudieron cargar los productos.';
        this.loadError.set(String(msg));
        this.loadingProducts.set(false);
      },
    });
  }

  // ========== PASO 1: SELECCIONAR PRODUCTOS ==========
  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelect(product: Product) {
    if (product.stock <= 0) {
      this.noStockError.set('No hay stock de este producto.');
      return;
    }

    this.noStockError.set(null);

    const current = new Set(this.selectedIds());
    if (current.has(product.id)) current.delete(product.id);
    else current.add(product.id);

    this.selectedIds.set(current);
  }

  canGoToConfigure(): boolean {
    return this.selectedIds().size > 0;
  }

  goToConfigure() {
    if (!this.canGoToConfigure()) return;

    const ids = this.selectedIds();
    const all = this.products();

    const lines: SaleLine[] = all
      .filter(p => ids.has(p.id))
      .map(p => ({
        productId: p.id,
        name: p.title,
        stockAvailable: p.stock,
        price1: p.price,     // ojo: tu modelo usa "price" como precio 1
        price2: p.price2,
        price3: p.price3,
        price4: p.price4,
        quantity: 0,
        selectedPriceKey: 'price1',
      }));

    this.lines.set(lines);
    this.step.set('configure');
  }

  // ========== PASO 2: CONFIGURAR LÍNEAS ==========
  changeQuantity(index: number, newValue: number) {
    const lines = [...this.lines()];
    const line = lines[index];
    if (!line) return;

    const numeric = Number(newValue);
    const qty = Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;

    if (qty > line.stockAvailable) {
      line.quantity = line.stockAvailable;
    } else {
      line.quantity = qty;
    }

    this.lines.set(lines);
  }

  adjustQuantity(index: number, delta: number) {
    const lines = [...this.lines()];
    const line = lines[index];
    if (!line) return;

    let next = line.quantity + delta;
    if (next < 0) next = 0;
    if (next > line.stockAvailable) next = line.stockAvailable;

    line.quantity = next;
    this.lines.set(lines);
  }

  changePriceKey(index: number, priceKey: PriceKey) {
    const lines = [...this.lines()];
    const line = lines[index];
    if (!line) return;

    line.selectedPriceKey = priceKey;
    this.lines.set(lines);
  }

  removeLine(index: number) {
    const lines = [...this.lines()];
    const line = lines[index];
    if (!line) return;

    const ok = confirm(`¿Deseas eliminar "${line.name}" de la venta?`);
    if (!ok) return;

    lines.splice(index, 1);
    this.lines.set(lines);

    const ids = new Set(this.selectedIds());
    ids.delete(line.productId);
    this.selectedIds.set(ids);

    if (!lines.length) this.step.set('select');
  }

  canGoToSummary(): boolean {
    const lines = this.lines();
    return lines.length > 0 && lines.every(l => l.quantity > 0);
  }

  goBackToSelect() {
    this.step.set('select');
  }

  goToSummary() {
    const invalid = this.lines().some(l => l.quantity <= 0);

    if (invalid) {
      this.quantityError.set(true);
      return;
    }

    this.quantityError.set(false);
    this.step.set('summary');
  }

  // ========== PASO 3: RESUMEN ==========
  getLineUnitPrice(line: SaleLine): number {
    return line[line.selectedPriceKey];
  }

  getLineTotal(line: SaleLine): number {
    return this.getLineUnitPrice(line) * line.quantity;
  }

  goBackToConfigure() {
    this.step.set('configure');
  }

confirmSale() {
  // 1) Validación: no vender sin cliente
  if (!this.selectedCustomer()) {
    this.customerError.set(true);
    this.step.set('customer');
    return;
  }

  // 2) Validación: cantidades > 0
  const invalid = this.lines().some(l => l.quantity <= 0);
  if (invalid) {
    this.quantityError.set(true);
    this.step.set('configure');
    return;
  }

  this.quantityError.set(false);
  this.saleError.set(null);

  // 3) Requests para descontar stock (una por producto)
  const requests = this.lines().map(line =>
    this.productsSvc.decreaseStock(line.productId, line.quantity),
  );

  // 4) Ejecutar todo
  forkJoin(requests).subscribe({
    next: () => {
      // refrescar productos (por si volvés a la selección)
      this.loadProducts();

      // marcar finalizado
      this.step.set('done');
    },
    error: (err) => {
      const msg =
        err?.error?.message ||
        err?.message ||
        'No se pudo registrar la venta.';

      this.saleError.set(String(msg));
      this.step.set('summary');
    }
  });
}

newSale() {
  // Reiniciar todo SIN confirmación
  this.selectedCustomer.set(null);
  this.selectedIds.set(new Set());
  this.lines.set([]);
  this.noStockError.set(null);
  this.quantityError.set(false);
  this.saleError.set(null);
  this.customerError.set(false);

  // Volver al primer paso
  this.step.set('customer');

  // (opcional) recargar listas
  this.loadCustomers();
  this.loadProducts();
}

cancelSale() {
  // Si ya estás en "done", no tiene sentido preguntar "cancelar"
  if (this.step() === 'done') {
    this.newSale();
    return;
  }

  const ok = confirm('¿Deseas cancelar esta venta?');
  if (!ok) return;

  this.newSale();
  }
}