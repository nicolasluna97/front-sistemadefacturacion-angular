import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import {
  CreateCustomerDto,
  CustomerModel,
} from '../../../core/models/customers';

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private http = inject(HttpClient);
  private apiUrl = '/api/customers';

  getAll() {
    return this.http.get<CustomerModel[]>(this.apiUrl);
  }

  create(dto: CreateCustomerDto) {
    return this.http.post<CustomerModel>(this.apiUrl, dto);
  }

  update(id: string, dto: CreateCustomerDto) {
    return this.http.patch<CustomerModel>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
