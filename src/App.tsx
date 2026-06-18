/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Navbar from './components/Navbar';
import ProductList from './components/ProductList';
import CartDrawer from './components/CartDrawer';
import AuthModal from './components/AuthModal';
import ReceiptGenerator from './components/ReceiptGenerator';
import { AppProvider, useToast, useReceipt, useStore } from './context/AppContext';
import InteractiveGalaxy from './components/InteractiveGalaxy';
import AdminPanel from './components/AdminPanel';

/**
 * Toast Overlay Component
 * Consumes the ToastContext directly to isolate toast rendering and re-renders.
 */
function ToastOverlay() {
  const { toastMessage } = useToast();
  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-24 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md p-4 shadow-xl flex items-center gap-3.5"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-slate-950 to-slate-800 text-sky-450 shadow-sm">
            <Check className="h-4.5 w-4.5 text-sky-400" />
          </div>
          <p className="text-[11px] font-bold text-slate-900 flex-1 leading-relaxed">{toastMessage}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Receipt Overlay Component
 * Consumes ReceiptContext to isolate receipt generation modal re-renders.
 */
function ReceiptOverlay() {
  const { activeReceipt, setActiveReceipt } = useReceipt();
  return (
    <AnimatePresence>
      {activeReceipt && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 210 }}
            className="w-full max-w-lg relative"
          >
            <ReceiptGenerator
              cartItems={activeReceipt.items}
              totalAmount={activeReceipt.totalAmount}
              transactionId={activeReceipt.transactionId}
              orderId={activeReceipt.orderId}
              date={activeReceipt.date}
              buyerName={activeReceipt.buyer.name}
              buyerEmail={activeReceipt.buyer.email}
              onClose={() => setActiveReceipt(null)}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Main application dashboard view.
 * Now completely static and serves as a high-performance shell container.
 * Sub-components consume separate contexts, meaning adding items, displaying toasts,
 * or logging in does NOT trigger visual re-evaluations inside this main shell!
 */
function StoreApp() {
  const { user, isAdminPanelOpen, setIsAdminPanelOpen } = useStore();
  const isUserAdmin = user?.email?.toLowerCase() === 'karmoshaar@gmail.com';

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 flex flex-col font-sans relative" dir="rtl">
      {/* Dynamic backdrop animation */}
      <InteractiveGalaxy />
      
      {/* Header navigation bar */}
      <Navbar />
 
      {/* Toast alert overlay (Subscribed to ToastContext) */}
      <ToastOverlay />

      {/* Admin Suite in-place inside Home dashboard (Apple UX style) */}
      <AnimatePresence>
        {isAdminPanelOpen && isUserAdmin && (
          <div className="mx-auto max-w-7xl w-full px-6 sm:px-8 lg:px-10 mt-8 relative z-10">
            <AdminPanel isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} />
          </div>
        )}
      </AnimatePresence>
 
      {/* Main product display stream (Subscribed to ProductContext & CartContext) */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 sm:px-8 lg:px-10 py-4 sm:py-6 md:py-8">
        <ProductList />
      </main>

      {/* Slide-out cart side view (Subscribed to CartContext, AuthContext, ToastContext & ReceiptContext) */}
      <CartDrawer />

      {/* Member authentication modal (Subscribed to AuthContext & ToastContext) */}
      <AuthModal />

      {/* Modal system to render successful invoices (Subscribed to ReceiptContext) */}
      <ReceiptOverlay />

      {/* Clean minimalist design footer */}
      <footer className="bg-white border-t border-slate-100 py-12 mt-16 text-center relative z-10 animate-fade-in" dir="rtl">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-right space-y-2">
            <h4 className="text-sm font-black text-slate-950 tracking-wide font-display flex items-center gap-2">
              <span>أثير سيلكت</span>
              <span className="h-1 w-1 rounded-full bg-sky-400" />
              <span className="text-[11px] text-slate-400 font-bold">منصة خدمات تقنية متطورة</span>
            </h4>
            <p className="text-[11px] text-slate-400 font-medium max-w-md leading-relaxed">
              مشروع هندسة متكامل يعتمد على إدارة مستقلة للحالات وواجهة مستخدم ذات معايير عالمية سريعة الاستجابة.
            </p>
            
            {/* Engineering Contribution */}
            <div className="pt-4 border-t border-slate-100/60 mt-4">
              <span className="block text-[8.5px] uppercase tracking-[0.15em] text-slate-400 font-extrabold mb-2.5">
                SYSTEM ARCHITECTURE & SOFTWARE ENGINEERING
              </span>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-black text-slate-900 justify-start">
                <span className="hover:text-sky-500 transition-colors duration-300 cursor-default">عبدالكريم شعار</span>
                <span className="text-slate-200 select-none">•</span>
                <span className="hover:text-indigo-500 transition-colors duration-300 cursor-default">عبدالمجيد بري</span>
                <span className="text-slate-200 select-none">•</span>
                <span className="hover:text-emerald-500 transition-colors duration-300 cursor-default">عدي سيد عيسى</span>
              </div>
              <p className="text-[9.5px] text-slate-400 mt-2 font-bold tracking-wide">
                قسم هندسة المعلوماتية • البرمجة المتقدمة ٢
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[9.5px] text-slate-400 font-bold justify-center md:justify-end">
            <span className="px-3 py-1.5 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all">توفير تراخيص JWT</span>
            <span className="px-3 py-1.5 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all">نظام حماية وسيط</span>
            <span className="px-3 py-1.5 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all">واجهة عرض متناسقة</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

/**
 * Global App Wrapper injects central Context Provider.
 */
export default function App() {
  return (
    <AppProvider>
      <StoreApp />
    </AppProvider>
  );
}
