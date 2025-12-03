import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProductsService, Product } from '../../products/services/products.service';
import { Navbar } from '../../../core/navbar/navbar';
import { Sidenav } from '../../../core/sidenav/sidenav';

@Component({
  selector: 'app-inventory-pages',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar, Sidenav],
  templateUrl: './inventory-pages.html',
  styleUrls: ['./inventory-pages.css']
})
export class InventoryPages implements OnInit {

  products: Product[] = [];
  editedProducts: Product[] = [];

  loading = false;
  editMode = false;
  deleteMode = false;

  selectedIds = new Set<string>();

  // 🔹 NUEVO: estado del formulario para agregar
  showAddForm = false;
  newProduct = {
    title: '',
    stock: 0,
    price: 0,
    price2: 0,
    price3: 0,
    price4: 0
  };

  constructor(private productsSvc: ProductsService) {}

  ngOnInit(): void {
    this.load();
  }

  // --------- CARGA ---------
  load() {
    this.loading = true;
    this.productsSvc.getProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.editedProducts = JSON.parse(JSON.stringify(data));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        alert('Error al cargar el inventario.');
      }
    });
  }

  // --------- FORMULARIO AGREGAR ---------
  openAddForm() {
    this.showAddForm = true;
    this.newProduct = {
      title: '',
      stock: 0,
      price: 0,
      price2: 0,
      price3: 0,
      price4: 0
    };
  }

  closeAddForm() {
    this.showAddForm = false;
  }

  saveNewProduct() {
    const title = this.newProduct.title.trim();
    if (!title) {
      alert('El nombre del producto es obligatorio.');
      return;
    }

    this.loading = true;

    this.productsSvc.createProduct(this.newProduct).subscribe({
      next: (product) => {
        this.loading = false;
        this.showAddForm = false;
        this.products.push(product);
        this.editedProducts = JSON.parse(JSON.stringify(this.products));
      },
      error: (err) => {
        console.error('Error creando producto', err);
        this.loading = false;
        alert('No se pudo crear el producto.');
      }
    });
  }

  // --------- EDITAR ---------
  toggleEditMode() {
    if (!this.editMode) {
      this.editedProducts = JSON.parse(JSON.stringify(this.products));
      this.editMode = true;
      return;
    }

    this.loading = true;
    const updates = this.editedProducts.map(p =>
      this.productsSvc.updateProduct(p.id, {
        title: p.title,
        stock: p.stock,
        price: p.price,
        price2: p.price2,
        price3: p.price3,
        price4: p.price4
      })
    );

    // guardado “rápido”, si algo falla recargamos
    Promise.all(updates.map(o => o.toPromise()))
      .then(() => {
        this.editMode = false;
        this.load();
      })
      .catch(err => {
        console.error(err);
        this.loading = false;
        alert('Error al guardar cambios.');
      });
  }

  cancelEdit() {
    this.editMode = false;
    this.editedProducts = JSON.parse(JSON.stringify(this.products));
  }

  // --------- ELIMINAR ---------
  onDeleteButton() {
    if (!this.deleteMode) {
      this.deleteMode = true;
      this.selectedIds.clear();
      return;
    }

    if (this.selectedIds.size === 0) {
      this.deleteMode = false;
      return;
    }

    const count = this.selectedIds.size;
    const msg = count === 1
      ? '¿Seguro que deseas eliminar el producto seleccionado?'
      : `¿Seguro que deseas eliminar ${count} productos?`;

    if (!confirm(msg)) return;

    this.loading = true;
    const ids = Array.from(this.selectedIds);

    Promise.all(ids.map(id => this.productsSvc.deleteProduct(id).toPromise()))
      .then(() => {
        this.loading = false;
        this.deleteMode = false;
        this.selectedIds.clear();
        this.load();
      })
      .catch(err => {
        console.error(err);
        this.loading = false;
        alert('Error al eliminar productos.');
      });
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  toggleSelected(id: string, checked: boolean) {
    if (checked) this.selectedIds.add(id);
    else this.selectedIds.delete(id);
  }
}
