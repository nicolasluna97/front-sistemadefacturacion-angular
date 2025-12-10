// src/app/modules/customers/services/customers.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import {
  CreateCustomerDto,
  CustomerModel,
} from '../../../core/models/customers';

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private http = inject(HttpClient);
  private baseUrl = environment.baseUrl;

  getAll() {
    // Observable<CustomerModel[]>
    return this.http.get<CustomerModel[]>(`${this.baseUrl}/customers`);
  }

  create(dto: CreateCustomerDto) {
    // Observable<CustomerModel>
    return this.http.post<CustomerModel>(`${this.baseUrl}/customers`, dto);
  }

  // (si más adelante querés update/delete, los dejé de ejemplo)
  update(id: string, dto: CreateCustomerDto) {
    return this.http.patch<CustomerModel>(
      `${this.baseUrl}/customers/${id}`,
      dto,
    );
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.baseUrl}/customers/${id}`);
  }
}
