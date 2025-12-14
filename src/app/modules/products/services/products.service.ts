import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProductsResponse {
  // Define la estructura que devuelve tu backend
  data: Product[];
  total?: number;
  page?: number;
  totalPages?: number;
}

export interface Product {
  id: string;
  title: string;
  stock: number;
  price: number;
  price2: number;
  price3: number;
  price4: number;
  userId: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private apiUrl = '/api/products';
  

  constructor(private http: HttpClient) {}

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl);
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  createProduct(productData: any): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, productData);
  }

  updateProduct(id: string, productData: any): Observable<Product> {
    return this.http.patch<Product>(`${this.apiUrl}/${id}`, productData);
  }

  decreaseStock(productId: string, quantity: number): Observable<Product> {
  return this.http.patch<Product>(`${this.apiUrl}/${productId}/decrease-stock`, {
    quantity,});
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}