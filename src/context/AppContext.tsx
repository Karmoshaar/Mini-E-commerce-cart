/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { CartItem, Product, User } from '../types';
import { authService, productService } from '../services/api';
import { DUMMY_PRODUCTS } from '../data/products';

// ==========================================
// 1. Toast Context (منفصل لمنع re-render التطبيق بالكامل عند إظهار التنبيهات)
// ==========================================
interface ToastContextType {
  toastMessage: string | null;
  showToast: (message: string, duration?: number) => void;
}
const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string, duration = 3000) => {
    setToastMessage(message);
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, duration);
    return () => clearTimeout(timer);
  };

  const value = useMemo(() => ({ toastMessage, showToast }), [toastMessage]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}


// ==========================================
// 2. Products Context (مستقل وجامد للتنزيل من الخادم مرة واحدة فقط)
// ==========================================
interface ProductContextType {
  products: Product[];
  isLoadingProducts: boolean;
  refreshProducts: () => Promise<void>;
}
const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(DUMMY_PRODUCTS);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);

  const fetchCatalog = async () => {
    setIsLoadingProducts(true);
    try {
      const remoteProducts = await productService.getProducts();
      setProducts(remoteProducts);
    } catch (err) {
      console.info("Info: Falling back to local catalog elements.", err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const value = useMemo(() => ({ products, isLoadingProducts, refreshProducts: fetchCatalog }), [products, isLoadingProducts]);
  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider_');
  }
  return context;
}


// ==========================================
// 3. Auth Context (مسؤول عن جلسة المستخدم فقط ولا يؤثر على قائمة المنتجات)
// ==========================================
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthOpen: boolean;
  setIsAuthOpen: (isOpen: boolean) => void;
  handleAuthSuccess: (token: string, user: User) => void;
  handleLogout: () => void;
  handleLogoutSilent: () => void;
  isAdminPanelOpen: boolean;
  setIsAdminPanelOpen: (isOpen: boolean) => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    try {
      const rawToken = localStorage.getItem('jwt_token');
      if (!rawToken || rawToken === 'null' || rawToken === 'undefined' || rawToken.trim() === '') {
        return null;
      }
      return rawToken;
    } catch {
      return null;
    }
  });
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState<boolean>(false);

  useEffect(() => {
    const initSession = async () => {
      if (token) {
        try {
          const data = await authService.checkSession(token);
          if (data.success) {
            setUser(data.user);
          } else {
            handleLogoutSilent();
          }
        } catch (err) {
          console.warn("Session verification: JWT session has expired or server is offline.", err);
          handleLogoutSilent();
        }
      }
    };
    initSession();
  }, [token]);

  const handleLogoutSilent = () => {
    localStorage.removeItem('jwt_token');
    setToken(null);
    setUser(null);
    setIsAdminPanelOpen(false);
  };

  const handleLogout = () => {
    handleLogoutSilent();
    showToast("Signed out successfully.");
  };

  const handleAuthSuccess = (newToken: string, newUser: { id: string; name: string; email: string }) => {
    localStorage.setItem('jwt_token', newToken);
    setToken(newToken);
    setUser(newUser);
    if (newUser.email.toLowerCase() === 'karmoshaar@gmail.com') {
      setIsAdminPanelOpen(true);
    }
    showToast(`Welcome back, ${newUser.name}!`);
  };

  const value = useMemo(() => ({
    user,
    token,
    isAuthOpen,
    setIsAuthOpen,
    handleAuthSuccess,
    handleLogout,
    handleLogoutSilent,
    isAdminPanelOpen,
    setIsAdminPanelOpen,
  }), [user, token, isAuthOpen, isAdminPanelOpen]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider_');
  }
  return context;
}


// ==========================================
// 4. Cart Context (منعزل لإدارة السلة والطلبات بنظام التحديث المنفصل)
// ==========================================
interface CartContextType {
  cart: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
  totalItemsCount: number;
}
const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem('souqcart_session');
      if (!savedCart || savedCart === 'null' || savedCart === 'undefined') return [];
      const parsed = JSON.parse(savedCart);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('souqcart_session', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { product, quantity: 1 }];
    });
    showToast(`Added "${product.name}" to cart.`);
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => setCart([]);

  const totalAmount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const value = useMemo(() => ({
    cart,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalAmount,
    totalItemsCount,
  }), [cart, isCartOpen, totalAmount, totalItemsCount]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider_');
  }
  return context;
}


// ==========================================
// 5. Receipt Context
// ==========================================
interface ReceiptContextType {
  activeReceipt: {
    transactionId: string;
    orderId: string;
    buyer: { name: string; email: string };
    totalAmount: number;
    date: string;
    items: CartItem[];
  } | null;
  setActiveReceipt: (receipt: any) => void;
}
const ReceiptContext = createContext<ReceiptContextType | undefined>(undefined);

export function ReceiptProvider({ children }: { children: ReactNode }) {
  const [activeReceipt, setActiveReceipt] = useState<ReceiptContextType['activeReceipt']>(null);

  const value = useMemo(() => ({ activeReceipt, setActiveReceipt }), [activeReceipt]);
  return <ReceiptContext.Provider value={value}>{children}</ReceiptContext.Provider>;
}

export function useReceipt() {
  const context = useContext(ReceiptContext);
  if (context === undefined) {
    throw new Error('useReceipt must be used within a ReceiptProvider_');
  }
  return context;
}


// ==========================================
// App Provider الموحد (لتجميع الـ Contexts في شجرة واحدة نظيفة)
// ==========================================
export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ProductProvider>
        <AuthProvider>
          <CartProvider>
            <ReceiptProvider>{children}</ReceiptProvider>
          </CartProvider>
        </AuthProvider>
      </ProductProvider>
    </ToastProvider>
  );
}


// ==========================================
// Hook للتوافق التراجعي (Backward Compatibility Hook)
// ==========================================
export function useStore() {
  const productsCtx = useProducts();
  const toastCtx = useToast();
  const authCtx = useAuth();
  const cartCtx = useCart();
  const receiptCtx = useReceipt();

  return useMemo(() => ({
    ...productsCtx,
    ...toastCtx,
    ...authCtx,
    ...cartCtx,
    ...receiptCtx,
  }), [productsCtx, toastCtx, authCtx, cartCtx, receiptCtx]);
}
