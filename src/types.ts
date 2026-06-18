/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// واجهة برمجية لتمثيل المنتج (Product Interface)
export interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number; // السعر الأصلي قبل الخصم (اختياري)
  category: string;
  image: string;
  description: string;
  rating: number; // التقييم من 5
}

// واجهة برمجية لتمثيل عنصر داخل سلة المشتريات (Cart Item Interface)
export interface CartItem {
  product: Product;
  quantity: number; // الكمية المضافة
}

// واجهة برمجية لتمثيل المستخدم (User Interface)
export interface User {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'user';
}
