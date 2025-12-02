import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import {
  ProductsService,
  Product
} from '../../products/services/products.service';
@Component({
  selector: 'app-inventory-pages',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, // 👈 necesario para [(ngModel)]
  ],
  templateUrl: './inventory-pages.html',
  styleUrls: ['./inventory-pages.css'],
})
export class InventoryPages implements OnInit {

  products: Product[] = [];
  editedProducts: Product[] = [];

  loading = false;
  editMode = false;
  deleteMode = false;

  selectedIds = new Set<string>();

  constructor(private productsSvc: ProductsService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  // ===== Cargar productos =====
  loadProducts(): void {
    this.loading = true;
    this.productsSvc.getProducts().subscribe({
      next: (items: Product[]) => {
        this.products = items;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        alert('No se pudo cargar el inventario.');
      }
    });
  }

  // ===== Agregar producto =====
  onAddProduct(): void {
    const title = prompt('Nombre del nuevo producto:');
    if (!title || !title.trim()) return;

    const dto = {
      title: title.trim(),
      stock: 0,
      price: 0,
      price2: 0,
      price3: 0,
      price4: 0,
    };

    this.loading = true;
    this.productsSvc.createProduct(dto).subscribe({
      next: (created: Product) => {
        this.products = [...this.products, created];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        alert('No se pudo crear el producto.');
      }
    });
  }

  // ===== Modo edición =====
  toggleEditMode(): void {
    if (!this.editMode) {
      this.editedProducts = this.products.map(p => ({ ...p }));
      this.editMode = true;
      return;
    }

    this.saveEdits();
  }

  private saveEdits(): void {
    if (!this.editedProducts.length) {
      this.editMode = false;
      return;
    }

    this.loading = true;

    const updateCalls = this.editedProducts.map(p =>
      this.productsSvc.updateProduct(p.id, {
        title: p.title,
        stock: p.stock ?? 0,
        price: p.price ?? 0,
        price2: p.price2 ?? 0,
        price3: p.price3 ?? 0,
        price4: p.price4 ?? 0,
      })
    );

    forkJoin(updateCalls).subscribe({
      next: (updated: Product[]) => {
        this.products = updated;
        this.editMode = false;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        alert('No se pudieron guardar los cambios.');
      }
    });
  }

  cancelEdit(): void {
    this.editMode = false;
    this.editedProducts = [];
  }

  // ===== Selección para eliminar =====
  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  toggleSelected(id: string, checked: boolean): void {
    if (checked) this.selectedIds.add(id);
    else this.selectedIds.delete(id);
  }

  onDeleteButton(): void {
    if (!this.deleteMode) {
      this.deleteMode = true;
      this.selectedIds.clear();
      return;
    }

    if (this.selectedIds.size === 0) {
      this.deleteMode = false;
      return;
    }

    const confirmDelete = confirm(
      `¿Seguro que querés eliminar ${this.selectedIds.size} producto(s)?`
    );
    if (!confirmDelete) return;

    this.loading = true;
    const ids = Array.from(this.selectedIds);
    const deleteCalls = ids.map(id => this.productsSvc.deleteProduct(id));

    forkJoin(deleteCalls).subscribe({
      next: () => {
        this.products = this.products.filter(p => !this.selectedIds.has(p.id));
        this.selectedIds.clear();
        this.deleteMode = false;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        alert('No se pudieron eliminar los productos seleccionados.');
      }
    });
  }
}
