/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import request from 'supertest';
import app from './server';
import mongoose from 'mongoose';

describe('اختبارات الواجهة الخلفية والـ API لمتجر تيك زون (Backend API Tests)', () => {
  
  // قبل الاختبارات: تأكد من إغلاق الاتصالات بـ Mongoose لتجنب بقاء المهام معلقة
  afterAll(async () => {
    await mongoose.disconnect();
  });

  // 1. اختبار مسار جلب المنتجات (GET /api/products)
  it('يجب جلب قائمة المنتجات بنجاح وإرجاع كود 200', async () => {
    const response = await request(app)
      .get('/api/products')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('products');
    expect(Array.isArray(response.body.products)).toBe(true);
  });

  // 2. اختبار محاولة الدخول الخاطئ (POST /api/auth/login) ببريد غير موجود
  it('يجب رفض تسجيل الدخول ببيانات اعتماد مفقودة للبريد الإلكتروني', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: '',
        password: 'fake_password'
      })
      .expect(400);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body.message).toContain('يرجى إدخال البريد الإلكتروني');
  });

  // 3. اختبار حماية مسار معالجة الدفع (POST /api/checkout) من الزوار غير المصرحين
  it('يجب حظر الدفع أو الشراء للزوار دون رمز JWT المميز', async () => {
    const response = await request(app)
      .post('/api/checkout')
      .send({
        items: [],
        totalAmount: 100
      })
      .expect(401);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('message');
  });
});
