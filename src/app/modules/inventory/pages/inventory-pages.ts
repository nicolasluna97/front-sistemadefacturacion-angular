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

  // selección para ELIMINAR
  selectedIds = new Set<string>();
  // selección para EDITAR
  editSelectedIds = new Set<string>();

  // -------- MODALES --------
  showAddForm = false;
  showConfirmUpdate = false;
  showConfirmDelete = false;

  // -------- NUEVO PRODUCTO --------
  newProduct: any = {
    title: '',
    stock: null,
    price: null,
    price2: null,
    price3: null,
    price4: null
  };

  newProductErrors = {
    title: '',
    stock: '',
    price: '',
    price2: '',
    price3: '',
    price4: ''
  };

  // errores por fila al editar
  editedErrors: {
    [id: string]: {
      title?: string;
      stock?: string;
      price?: string;
      price2?: string;
      price3?: string;
      price4?: string;
    }
  } = {};

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
        this.editedErrors = {};
        this.selectedIds.clear();
        this.editSelectedIds.clear();
      },
      error: () => {
        this.loading = false;
        alert('Error al cargar el inventario.');
      }
    });
  }

  // ========= HELPERS =========

  private normalizeNumber(value: any): number | 'invalid' {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    const n = Number(value);
    if (isNaN(n) || n < 0) {
      return 'invalid';
    }
    return n;
  }

  // --------- VALIDAR NUEVO PRODUCTO ---------
  private validateNewProduct(): boolean {
    let valid = true;

    this.newProductErrors = {
      title: '',
      stock: '',
      price: '',
      price2: '',
      price3: '',
      price4: ''
    };

    const title = (this.newProduct.title || '').trim();
    if (!title) {
      this.newProductErrors.title = 'Se necesita que el producto tenga un título';
      valid = false;
    } else {
      this.newProduct.title = title;
    }

    const checkField = (field: keyof typeof this.newProductErrors) => {
      const normalized = this.normalizeNumber(this.newProduct[field]);
      if (normalized === 'invalid') {
        this.newProductErrors[field] = 'No se aceptan letras y/o números negativos';
        valid = false;
      } else {
        this.newProduct[field] = normalized;
      }
    };

    checkField('stock');
    checkField('price');
    checkField('price2');
    checkField('price3');
    checkField('price4');

    return valid;
  }

  // --------- VALIDAR EDITADOS (solo filas seleccionadas) ---------
  private validateEditedProducts(): boolean {
    let valid = true;
    this.editedErrors = {};

    const idsSelected = new Set(this.editSelectedIds);

    for (const p of this.editedProducts) {
      if (!idsSelected.has(p.id)) continue; // solo los seleccionados

      const rowErr: any = {};

      const title = (p.title || '').trim();
      if (!title) {
        rowErr.title = 'Se necesita que el producto tenga un título';
        valid = false;
      } else {
        p.title = title;
      }

      const checkField = (field: 'stock' | 'price' | 'price2' | 'price3' | 'price4') => {
        const value: any = (p as any)[field];
        const normalized = this.normalizeNumber(value);
        if (normalized === 'invalid') {
          rowErr[field] = 'No se aceptan letras y/o números negativos';
          valid = false;
        } else {
          (p as any)[field] = normalized;
        }
      };

      checkField('stock');
      checkField('price');
      checkField('price2');
      checkField('price3');
      checkField('price4');

      if (Object.keys(rowErr).length > 0) {
        this.editedErrors[p.id] = rowErr;
      }
    }

    return valid;
  }

  // ========= FORMULARIO AGREGAR =========

  openAddForm() {
    this.showAddForm = true;
    this.newProduct = {
      title: '',
      stock: null,
      price: null,
      price2: null,
      price3: null,
      price4: null
    };
    this.newProductErrors = {
      title: '',
      stock: '',
      price: '',
      price2: '',
      price3: '',
      price4: ''
    };
  }

  closeAddForm() {
    this.showAddForm = false;
  }

  saveNewProduct() {
    if (!this.validateNewProduct()) return;

    this.loading = true;

    this.productsSvc.createProduct(this.newProduct).subscribe({
      next: (product) => {
        this.loading = false;
        this.showAddForm = false;
        this.products.push(product);
        this.editedProducts = JSON.parse(JSON.stringify(this.products));
        this.editedErrors = {};
      },
      error: (err) => {
        console.error('Error creando producto', err);
        this.loading = false;
        alert('No se pudo crear el producto.');
      }
    });
  }

  // ========= EDITAR =========

  onEditButton() {
    // entrar en modo edición
    if (!this.editMode) {
      this.editedProducts = JSON.parse(JSON.stringify(this.products));
      this.editedErrors = {};
      this.editSelectedIds.clear();
      this.editMode = true;
      return;
    }

    // ya estamos en editMode → usuario clicó "Guardar cambios"
    if (this.editSelectedIds.size === 0) {
      // si no hay nada seleccionado, salimos sin hacer nada
      this.editMode = false;
      this.editedProducts = JSON.parse(JSON.stringify(this.products));
      this.editedErrors = {};
      return;
    }

    // abrimos modal de confirmación
    this.showConfirmUpdate = true;
  }

  isEditSelected(id: string): boolean {
    return this.editSelectedIds.has(id);
  }

  toggleEditSelected(id: string, checked: boolean) {
    if (checked) this.editSelectedIds.add(id);
    else this.editSelectedIds.delete(id);
  }

  async confirmUpdate() {
    this.showConfirmUpdate = false;

    if (!this.validateEditedProducts()) {
      // si hay errores, se pintan en la tabla y NO llama al backend
      return;
    }

    this.loading = true;
    const idsToUpdate = new Set(this.editSelectedIds);
    let errors = 0;

    for (const p of this.editedProducts) {
      if (!idsToUpdate.has(p.id)) continue;

      try {
        await this.productsSvc.updateProduct(p.id, {
          title: p.title,
          stock: p.stock,
          price: p.price,
          price2: p.price2,
          price3: p.price3,
          price4: p.price4
        }).toPromise();
      } catch (e) {
        console.error(e);
        errors++;
      }
    }

    this.loading = false;

    if (errors > 0) {
      alert('Error al guardar algunos cambios.');
    }

    this.editMode = false;
    this.editSelectedIds.clear();
    this.load();
  }

  cancelEdit() {
    this.editMode = false;
    this.editedProducts = JSON.parse(JSON.stringify(this.products));
    this.editedErrors = {};
    this.editSelectedIds.clear();
  }

  // ========= ELIMINAR =========

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

    // abrimos modal de confirmación
    this.showConfirmDelete = true;
  }
  

  async confirmDelete() {
    if (this.selectedIds.size === 0) {
      this.showConfirmDelete = false;
      this.deleteMode = false;
      return;
    }

    this.loading = true;
    const ids = Array.from(this.selectedIds);
    let errors = 0;

    try {
      // eliminamos uno por uno usando deleteProduct (el que ya existe en el service)
      for (const id of ids) {
        try {
          await this.productsSvc.deleteProduct(id).toPromise();
        } catch (e) {
          console.error(e);
          errors++;
        }
      }

      this.loading = false;
      this.showConfirmDelete = false;
      this.deleteMode = false;
      this.selectedIds.clear();

      if (errors > 0) {
        alert('Error al eliminar algunos productos.');
      }

      this.load();
    } catch (err) {
      console.error(err);
      this.loading = false;
      this.showConfirmDelete = false;
      alert('Error al eliminar productos.');
    }
  }

  get deleteButtonLabel(): string {
    if (!this.deleteMode) {
      return 'Eliminar productos';
    }
    if (this.selectedIds.size === 0) {
      return 'Cancelar eliminación';
    }
    return 'Confirmar eliminación';
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  toggleSelected(id: string, checked: boolean) {
    if (checked) this.selectedIds.add(id);
    else this.selectedIds.delete(id);
  }
}