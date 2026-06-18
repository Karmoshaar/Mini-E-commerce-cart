/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from 'axios';
import { Product } from '../types';

const apiClient = axios.create({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authService = {
  checkSession: async (token: string) => {
    const response = await apiClient.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  login: async (credentials: any) => {
    const response = await apiClient.post('/api/auth/login', credentials);
    return response.data;
  },

  register: async (data: any) => {
    const response = await apiClient.post('/api/auth/register', data);
    return response.data;
  }
};

export const productService = {
  getProducts: async (): Promise<Product[]> => {
    const response = await apiClient.get('/api/products');
    if (response.data?.success && Array.isArray(response.data.products)) {
      return response.data.products;
    }
    throw new Error('Failed to retrieve products catalog.');
  },
  rateProduct: async (productId: number, rating: number) => {
    const response = await apiClient.post(`/api/products/${productId}/rate`, { rating });
    return response.data;
  }
};

export const checkoutService = {
  processCheckout: async (cartItems: any[], totalAmount: number, token: string) => {
    const response = await apiClient.post('/api/checkout', {
      items: (cartItems || []).map(item => {
        const prod = item?.product || {};
        return {
          productId: prod.id || 0,
          name: prod.name || 'Unnamed Product',
          quantity: item?.quantity || 1,
          price: prod.price || 0
        };
      }),
      totalAmount
    }, {
      headers: { 
        Authorization: `Bearer ${token}` 
      }
    });
    return response.data;
  }
};

export const adminService = {
  getUsers: async () => {
    const response = await apiClient.get('/api/admin/users');
    return response.data;
  },
  addProduct: async (productData: Omit<Product, 'id'>) => {
    const response = await apiClient.post('/api/products', productData);
    return response.data;
  },
  deleteProduct: async (productId: number) => {
    const response = await apiClient.delete(`/api/products/${productId}`);
    return response.data;
  }
};

export default apiClient;
