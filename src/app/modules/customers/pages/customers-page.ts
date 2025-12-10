// src/app/modules/customers/pages/customers-page.ts
import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { CustomersService } from '../services/customers.service';
import {
  CreateCustomerDto,
  CustomerModel,
} from '../../../core/models/customers';
import { Navbar } from 'src/app/core/navbar/navbar';
import { Sidenav } from 'src/app/core/sidenav/sidenav';

@Component({
  standalone: true,
  selector: 'app-customers-page',
  templateUrl: './customers-page.html',
  styleUrls: ['./customers-page.css'],
  imports: [CommonModule, ReactiveFormsModule, Navbar, Sidenav],
})
export class CustomersPage implements OnInit {
  private fb = inject(FormBuilder);
  private customersSvc = inject(CustomersService);

  customers = signal<CustomerModel[]>([]);
  loading = false;
  loadError: string | null = null;

  saveLoading = false;
  saveError: string | null = null;

  form = this.fb.nonNullable.group({
    name: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(30)],
    ],
    companyName: [''],
    email: [''],
    phone: [''],
    address: [''],
  });

  get nameCtrl() {
    return this.form.controls.name;
  }
  
  get emailCtrl() {
  return this.form.controls.email;
  }


  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers() {
    this.loading = true;
    this.loadError = null;

    this.customersSvc
      .getAll()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (items: CustomerModel[]) => this.customers.set(items),
        error: (err: any) => {
          const msg =
            err?.error?.message ||
            err?.message ||
            'No se pudieron cargar los clientes.';
          this.loadError = String(msg);
        },
      });
  }

  submit() {
    this.saveError = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saveLoading = true;

    const dto: CreateCustomerDto = this.form.getRawValue();

    this.customersSvc
      .create(dto)
      .pipe(finalize(() => (this.saveLoading = false)))
      .subscribe({
        next: (created: CustomerModel) => {
          this.customers.set([...this.customers(), created]);
          this.form.reset();
        },
        error: (err: any) => {
          const msg =
            err?.error?.message ||
            err?.message ||
            'No se pudo crear el cliente.';
          this.saveError = Array.isArray(msg) ? msg.join(' ') : String(msg);
        },
      });
  }
}
