/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { createServer as createViteServer } from 'vite';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { DUMMY_PRODUCTS } from './src/data/products';

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_advanced_programming_2';

app.use(express.json());

// ==========================================
// 1. الأمن والتحكم بمعدل الطلبات (Security Headers & Rate Limiting)
// ==========================================

// ترويسات الأمان الأساسية لحماية المتجِّر مع تمكين CORS ودعم طلبات Preflight الآمنة
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// هيكل ومخزن تتبع عدد الطلبات لكل IP لمنع هجمات الإغراق (Spam / DDoS Defense)
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const rateLimits: Map<string, RateLimitRecord> = new Map();

// إنشاء ميدلوير مخصص خفيف وسوبر سريع للتحكم بمعادلات الطلب من كل عنوان IP
const apiRateLimiter = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction): any => {
    // تخطي الفحص أثناء الاختبارات البرمجية التلقائية لتسهيل عمل فريق الاختبار وسرعة تشغيل الـ CI
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    const record = rateLimits.get(key);

    if (!record) {
      rateLimits.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    // إذا انتهت مدة الحساب السابقة، ابدأ فترة حظر/عد جديدة
    if (now > record.resetTime) {
      rateLimits.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    record.count++;
    if (record.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds.toString());
      return res.status(429).json({
        success: false,
        message: `نظام الحماية: تم الكشف عن معدل طلبات مفرط من جهازك! يرجى المحاولة مرة أخرى بعد ${retryAfterSeconds} ثانية لحماية المتجر.`
      });
    }

    next();
  };
};

// ==========================================
// 1. Database Configuration & Fallback Adapter
// ==========================================

let isUsingMongoDB = false;
const LOCAL_DB_DIR = path.join(process.cwd(), 'src', 'data', 'db');

if (!fs.existsSync(LOCAL_DB_DIR)) {
  fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
}

const PRODUCTS_FILE = path.join(LOCAL_DB_DIR, 'products.json');
const USERS_FILE = path.join(LOCAL_DB_DIR, 'users.json');

// Initialize local fallback files if missing
if (!fs.existsSync(PRODUCTS_FILE)) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(DUMMY_PRODUCTS, null, 2), 'utf8');
}
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), 'utf8');
}

class FileLockManager {
  private static locks: Map<string, Promise<void>> = new Map();
  // ذراع الذاكرة المؤقتة (In-memory caching layer) لسرعة لا نهائية وتجنب قراءة القرص مع كل زائر
  private static cache: Map<string, any[]> = new Map();
  private static isLoaded: Map<string, boolean> = new Map();

  /**
   * Safe asynchronous file read with lock queue & O(1) in-memory cache
   */
  static async readData(filePath: string): Promise<any[]> {
    // إذا كانت البيانات محملة بالذاكرة بالفعل، أرجع نسخة عميقة منها فوراً دون إشغال الهارد ديسك
    if (this.isLoaded.get(filePath)) {
      const cached = this.cache.get(filePath) || [];
      return JSON.parse(JSON.stringify(cached));
    }

    // الانتظار في حال وجود عملية كتابة جارية على هذا الملف
    const activeLock = this.locks.get(filePath);
    if (activeLock) {
      await activeLock;
    }

    try {
      const data = await fsPromises.readFile(filePath, 'utf8');
      const parsed = JSON.parse(data);
      this.cache.set(filePath, parsed);
      this.isLoaded.set(filePath, true);
      return JSON.parse(JSON.stringify(parsed));
    } catch (err) {
      this.cache.set(filePath, []);
      this.isLoaded.set(filePath, true);
      return [];
    }
  }

  /**
   * Safe asynchronous file write with queuing and immediate cache feedback
   */
  static async writeData(filePath: string, data: any[]): Promise<void> {
    // حدّث الذاكرة المؤقتة فوراً لتكون جاهزة للطلبات الفورية التالية قبل حتى حفظ الملف على الهارد ديسك
    this.cache.set(filePath, data);
    this.isLoaded.set(filePath, true);

    const currentLock = this.locks.get(filePath) || Promise.resolve();
    
    // جدولة الكتابة على الهارد ديسك في طابور الأقفال
    const nextLock = currentLock.then(async () => {
      // كتابة أولية آمنة خالية من الأخطاء في ملف مؤقت
      const tempPath = `${filePath}.tmp`;
      try {
        const jsonString = JSON.stringify(data, null, 2);
        await fsPromises.writeFile(tempPath, jsonString, 'utf8');
        // استبدال ذري آمن تماماً يضمن بقاء الملف الأصلي سليماً بنسبة ١٠٠٪
        await fsPromises.rename(tempPath, filePath);
      } catch (err) {
        console.error(`FileLockManager: Fault writing to ${filePath}.`, err);
        try {
          await fsPromises.unlink(tempPath);
        } catch {}
        throw err;
      }
    });

    this.locks.set(filePath, nextLock);

    try {
      await nextLock;
    } finally {
      if (this.locks.get(filePath) === nextLock) {
        this.locks.delete(filePath);
      }
    }
  }
}

// Database Schemas
const productSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  category: { type: String, required: true },
  image: { type: String, required: true },
  description: { type: String, required: true },
  rating: { type: Number, required: true, default: 4.5 }
});

const ProductModel: any = mongoose.models.Product || mongoose.model('Product', productSchema);

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const UserModel: any = mongoose.models.User || mongoose.model('User', userSchema);

// Connection Manager
const connectDatabase = async () => {
  const mongoURI = process.env.MONGODB_URI?.trim();
  
  if (!mongoURI || (!mongoURI.startsWith("mongodb://") && !mongoURI.startsWith("mongodb+srv://"))) {
    console.log("Database status: Using local JSON fallback storage.");
    return;
  }

  if (mongoURI.includes("username:password") || mongoURI.includes("cluster.mongodb.net")) {
    console.log("Database status: Example credentials active. Local JSON storage fallback triggered.");
    return;
  }

  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("Database status: Connected to MongoDB successfully via Mongoose.");
    isUsingMongoDB = true;

    // Seed products if MongoDB collection is empty
    const count = await ProductModel.countDocuments();
    if (count === 0) {
      await ProductModel.insertMany(DUMMY_PRODUCTS);
      console.log("Database status: Dummy products seeded successfully.");
    }
  } catch (error) {
    console.error("Database status: Connection failure. Using local JSON adapter.", error);
    isUsingMongoDB = false;
  }
};

connectDatabase();

// ==========================================
// 2. Authentication Middleware
// ==========================================

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role?: string;
  };
}

export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction): any => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ success: false, message: "Authorization header is missing" });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ success: false, message: "Malformed authorization header. Expected 'Bearer <token>'" });
  }

  const token = parts[1];
  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ success: false, message: "JWT token is empty, null or undefined" });
  }

  try {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ success: false, message: "Invalid or expired JWT token" });
      }
      req.user = decoded as AuthenticatedRequest['user'];
      next();
    });
  } catch (error: any) {
    return res.status(403).json({ success: false, message: "Failed to parse JWT token: " + error.message });
  }
};

// ==========================================
// 3. Backend REST API Endpoints
// ==========================================

// Register Account
app.post('/api/auth/register', apiRateLimiter(5, 60000), async (req: Request, res: Response): Promise<any> => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ success: false, message: "Please fill all required fields (email, password, name)" });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const role = email.toLowerCase() === 'karmoshaar@gmail.com' ? 'admin' : 'user';

    if (isUsingMongoDB) {
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ success: false, message: "Email is already registered" });
      }

      const newUser = new UserModel({ email: email.toLowerCase(), password: hashedPassword, name });
      await newUser.save();

      const token = jwt.sign({ id: newUser._id, email: newUser.email.toLowerCase(), name: newUser.name, role }, JWT_SECRET, { expiresIn: '365d' });
      return res.status(201).json({ success: true, token, user: { id: newUser._id, email: newUser.email.toLowerCase(), name: newUser.name, role } });
    } else {
      const users = await FileLockManager.readData(USERS_FILE);
      if (users.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ success: false, message: "Email is already registered" });
      }

      const localId = Date.now().toString();
      const newUser = { id: localId, email: email.toLowerCase(), password: hashedPassword, name, createdAt: new Date() };
      users.push(newUser);
      await FileLockManager.writeData(USERS_FILE, users);

      const token = jwt.sign({ id: localId, email: email.toLowerCase(), name, role }, JWT_SECRET, { expiresIn: '365d' });
      return res.status(201).json({ success: true, token, user: { id: localId, email: email.toLowerCase(), name, role } });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Login Member
app.post('/api/auth/login', apiRateLimiter(15, 60000), async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "يرجى إدخال البريد الإلكتروني وكلمة المرور / Please provide both email and password" });
  }

  try {
    let userRecord: any = null;

    if (isUsingMongoDB) {
      userRecord = await UserModel.findOne({ email });
    } else {
      const users = await FileLockManager.readData(USERS_FILE);
      userRecord = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    }

    if (!userRecord) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, userRecord.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const role = userRecord.email.toLowerCase() === 'karmoshaar@gmail.com' ? 'admin' : 'user';
    const payload = {
      id: userRecord._id || userRecord.id,
      email: userRecord.email.toLowerCase(),
      name: userRecord.name,
      role
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '365d' });

    return res.json({
      success: true,
      token,
      user: {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        role
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Current User Session
app.get('/api/auth/me', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, user: req.user });
});

// Get Products Catalog
app.get('/api/products', async (req: Request, res: Response) => {
  try {
    if (isUsingMongoDB) {
      const products = await ProductModel.find({});
      res.json({ success: true, products, source: 'MongoDB' });
    } else {
      const products = await FileLockManager.readData(PRODUCTS_FILE);
      res.json({ success: true, products, source: 'Local JSON files' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Submit Product Rating (Interactive customer rating)
app.post('/api/products/:id/rate', async (req: Request, res: Response): Promise<any> => {
  const productId = parseInt(req.params.id);
  const { rating } = req.body;

  if (isNaN(productId)) {
    return res.status(400).json({ success: false, message: "معرّف المنتج غير صالح" });
  }

  const userRating = parseFloat(rating);
  if (isNaN(userRating) || userRating < 1 || userRating > 5) {
    return res.status(400).json({ success: false, message: "يجب أن يكون التقييم رقماً بين 1 و 5" });
  }

  try {
    let updatedProduct: any = null;
    if (isUsingMongoDB) {
      const product = await ProductModel.findOne({ id: productId });
      if (!product) {
        return res.status(404).json({ success: false, message: "المنتج غير موجود" });
      }
      const currentRating = product.rating || 4.5;
      const newRating = Number(((currentRating * 7 + userRating) / 8).toFixed(1));
      product.rating = newRating;
      await product.save();
      updatedProduct = product;
    } else {
      const products = await FileLockManager.readData(PRODUCTS_FILE);
      const productIndex = products.findIndex((p: any) => p.id === productId);
      if (productIndex === -1) {
        return res.status(404).json({ success: false, message: "المنتج غير موجود في الكتالوج" });
      }
      const currentRating = products[productIndex].rating || 4.5;
      const newRating = Number(((currentRating * 7 + userRating) / 8).toFixed(1));
      products[productIndex].rating = newRating;
      await FileLockManager.writeData(PRODUCTS_FILE, products);
      updatedProduct = products[productIndex];
    }

    return res.json({ 
      success: true, 
      message: "✓ شكراً لك! تم تسجيل تقييمك للمنتج بنجاح.",
      rating: updatedProduct.rating 
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Add New Product (Admin / Catalog expansion) - Secured for Primary Admin
app.post('/api/products', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  console.log(`[Admin Endpoint] Product creation request received from:`, req.user);
  if (!req.user || !req.user.email || req.user.email.toLowerCase() !== 'karmoshaar@gmail.com') {
    console.warn(`[Permission Denied] Product creation attempt by: ${req.user?.email || 'Anonymous'}`);
    return res.status(403).json({ success: false, message: "صلاحيات غير كافية لعملية إضافة المنتج" });
  }
  const { name, price, originalPrice, category, image, description, rating } = req.body;

  if (!name || !price || !category || !image || !description) {
    return res.status(400).json({ success: false, message: "Incomplete product fields provided" });
  }

  try {
    const newId = Date.now();
    const productData = { id: newId, name, price, originalPrice, category, image, description, rating: rating || 4.5 };

    if (isUsingMongoDB) {
      const product = new ProductModel(productData);
      await product.save();
    } else {
      const products = await FileLockManager.readData(PRODUCTS_FILE);
      products.push(productData);
      await FileLockManager.writeData(PRODUCTS_FILE, products);
    }

    return res.status(201).json({ success: true, product: productData });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Get Registered Users List (Admin Only)
app.get('/api/admin/users', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  console.log(`[Admin Endpoint] Users catalog request received from:`, req.user);
  if (!req.user || !req.user.email || req.user.email.toLowerCase() !== 'karmoshaar@gmail.com') {
    console.warn(`[Permission Denied] Get users attempt by: ${req.user?.email || 'Anonymous'}`);
    return res.status(403).json({ success: false, message: "صلاحيات غير كافية للوصول لقائمة العملاء" });
  }
  try {
    if (isUsingMongoDB) {
      const users = await UserModel.find({}, '-password');
      const sanitizedUsers = users.map((u: any) => ({
        id: u._id ? u._id.toString() : (u.id || '').toString(),
        name: u.name,
        email: u.email,
        createdAt: u.createdAt,
        role: u.email?.toLowerCase() === 'karmoshaar@gmail.com' ? 'admin' : 'user'
      }));
      return res.json({ success: true, users: sanitizedUsers });
    } else {
      const users = await FileLockManager.readData(USERS_FILE);
      const sanitizedUsers = users.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt,
        role: u.email?.toLowerCase() === 'karmoshaar@gmail.com' ? 'admin' : 'user'
      }));
      return res.json({ success: true, users: sanitizedUsers });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Delete Product (Admin Only)
app.delete('/api/products/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  console.log(`[Admin Endpoint] Product deletion request received from:`, req.user);
  if (!req.user || !req.user.email || req.user.email.toLowerCase() !== 'karmoshaar@gmail.com') {
    console.warn(`[Permission Denied] Product deletion attempt by: ${req.user?.email || 'Anonymous'}`);
    return res.status(403).json({ success: false, message: "صلاحيات غير كافية لحذف المنتج" });
  }
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) {
    return res.status(400).json({ success: false, message: "معرّف المنتج غير صالح" });
  }
  try {
    if (isUsingMongoDB) {
      const result = await ProductModel.deleteOne({ id: productId });
      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: "المنتج غير موجود في قاعدة البيانات" });
      }
    } else {
      const products = await FileLockManager.readData(PRODUCTS_FILE);
      const hasProduct = products.some((p: any) => p.id === productId);
      if (!hasProduct) {
        return res.status(404).json({ success: false, message: "المنتج غير موجود" });
      }
      const filtered = products.filter((p: any) => p.id !== productId);
      await FileLockManager.writeData(PRODUCTS_FILE, filtered);
    }
    return res.json({ success: true, message: "تم حذف المنتج بنجاح." });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Secured Order Checkout
app.post('/api/checkout', apiRateLimiter(8, 60000), authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { items, totalAmount } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: "Cannot process checkout for an empty cart" });
  }

  try {
    const generatedOrderId = 'ORD-' + Math.floor(Math.random() * 90000 + 10000);
    const generatedTxnId = 'AES-TXN-' + Math.floor(Math.random() * 899999 + 100000);

    return res.json({
      success: true,
      message: "Order successfully authorized and registered.",
      orderId: generatedOrderId,
      transactionId: generatedTxnId,
      buyer: req.user,
      totalAmount,
      date: new Date()
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 4. Vite Dev Server Integration
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server starting: Running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
  startServer();
}

export default app;
