/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ShoppingCart, CheckCircle, CreditCard, Sparkles, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CartItem, Product } from '../types';
import CheckoutProcess from './CheckoutProcess';
import { useCart, useAuth } from '../context/AppContext';

export default function CartDrawer() {
  const {
    isCartOpen: isOpen,
    setIsCartOpen,
    cart: cartItems,
    updateQuantity: onUpdateQuantity,
    removeFromCart: onRemoveItem,
    clearCart: onClearCart,
    totalAmount,
  } = useCart();

  const {
    user,
    setIsAuthOpen,
  } = useAuth();

  const onClose = () => setIsCartOpen(false);
  const onOpenAuth = () => setIsAuthOpen(true);

  // حالة لإتمام عملية الشراء (Success State)
  const [checkoutSuccess, setCheckoutSuccess] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // دالة إعادة تهيئة الطلب بعد نجاح الدفع (Reset state)
  const handleResetCheckout = () => {
    onClearCart();
    setCheckoutSuccess(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* الخلفية المظلمة الشفافة (Backdrop overlay) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-3xs"
          />

          {/* الدرج الجانبي (Side Drawer Canvas) */}
          <motion.div
            initial={{ x: '100%' }} // يظهر ويدخل من اليمين بنعومة عالية
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col border-l border-gray-100"
            dir="rtl"
            id="cart-drawer-container"
          >
            {/* الترويسة (Header) */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-sky-500 animate-pulse" />
                <h2 className="text-sm font-black text-slate-900">سلة المشتريات</h2>
                <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-[10px] font-black text-sky-600 ring-1 ring-sky-100 font-mono">
                  {cartItems.reduce((acc, curr) => acc + curr.quantity, 0)} قطع
                </span>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                id="close-cart-btn"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* محتوى السلة (Cart Content Panel) */}
            <div className="flex-1 overflow-y-auto px-6 py-5 bg-white">
              {checkoutSuccess ? (
                /* واجهة نجاح الدفع الأنيقة (Success animation) */
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="flex h-full flex-col justify-between p-2 text-right"
                >
                  <div className="flex flex-col items-center text-center pt-8">
                    {/* أيقونة النجاح الأكثر فخامة وتأثيراً بصرياً مع الطبقات المترابطة هندسياً */}
                    <div className="relative mb-6">
                      {/* حلقتين متوهجتين تدوران ببطء متعاكس كجزء من دقة الهندسة البصرية */}
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
                        className="absolute inset-0 rounded-full border border-dashed border-emerald-400/30 -m-3"
                      />
                      <motion.div 
                        animate={{ rotate: -360 }}
                        transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
                        className="absolute inset-0 rounded-full border border-dotted border-sky-400/30 -m-5"
                      />

                      {/* الهالة المتوهجة خلف أيقونة الصح */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500/10 to-sky-500/10 blur-xl scale-125" />
                      
                      <motion.div
                        initial={{ scale: 0.4 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                        className="relative z-10 bg-gradient-to-tr from-emerald-500 to-teal-400 p-5 rounded-full shadow-[0_10px_30px_rgba(16,185,129,0.3)]"
                      >
                        <CheckCircle className="h-10 w-10 text-white" />
                      </motion.div>
                      
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="absolute -top-1.5 -right-1.5 bg-amber-400 p-1.5 rounded-lg text-slate-950 shadow-md"
                      >
                        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                      </motion.div>
                    </div>

                    <h3 className="text-sm font-black text-slate-950 font-display tracking-normal">
                      اكتملت العملية بنجاح!
                    </h3>
                    <p className="mt-2 text-[10px] text-slate-400 leading-relaxed max-w-xs font-bold font-sans">
                      تم إصدار وتوثيق فاتورتك عبر منصة <span className="text-slate-800 font-extrabold">أثِير سيلكت</span> الفاخرة، وحفظها بسجل المعاملات بنجاح.
                    </p>
                  </div>

                  {/* إيصال الدفع التخيلي المصمم كقطعة هندسة فنية */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="relative overflow-hidden bg-slate-50 border border-slate-200/80 rounded-2xl p-5 my-6 shadow-xs"
                  >
                    {/* نمط قص حواف الإيصال الجمالي الأسفل والأعلى */}
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400" />
                    
                    <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-3 mb-3">
                      <div>
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Transaction SKU</span>
                        <span className="font-mono text-[9px] font-bold text-slate-700">AES-7849-0{Math.floor(Math.random() * 900 + 100)}</span>
                      </div>
                      <div className="text-left">
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Status</span>
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5 text-[8.5px] font-black">
                          مقبولة ومعتمدة
                        </span>
                      </div>
                    </div>

                    {/* معلومات العناصر التي تم شراؤها كقائمة ناعمة ومحسوبة */}
                    <div className="space-y-1.5 max-h-24 overflow-y-auto mb-3 pr-1">
                      {cartItems.map((item) => (
                        <div key={item.product.id} className="flex justify-between items-center text-[9.5px] text-slate-600 font-bold">
                          <span className="line-clamp-1 flex-grow pr-2 font-sans font-medium">
                             • {item.product.name} <span className="font-mono text-slate-400">({item.quantity}x)</span>
                          </span>
                          <span className="font-mono text-slate-800 shrink-0">${(item.product.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2.5 border-t border-slate-200/85 space-y-1">
                      <div className="flex justify-between text-[10px] font-black text-slate-500">
                        <span>نوع الترخيص والأمان:</span>
                        <span className="text-slate-800 font-mono text-[9px]">JWT Secure Authentication</span>
                      </div>
                      <div className="flex justify-between text-xs font-black text-slate-950 pt-2 border-t border-dashed border-slate-200/70 mt-1">
                        <span>القيمة الصافية المدفوعة:</span>
                        <span className="text-emerald-600 font-mono text-sm">${totalAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* باركود توثيقي جمالي مبتكر في أسفل الإيصال */}
                    <div className="mt-4 flex flex-col items-center justify-center opacity-65">
                      <div className="h-6 w-36 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 rounded-xs flex items-center justify-around px-2 py-0.5">
                        <div className="w-[1.5px] h-full bg-white bg-opacity-95" />
                        <div className="w-[3px] h-full bg-white bg-opacity-95" />
                        <div className="w-[1px] h-full bg-white bg-opacity-95" />
                        <div className="w-[2px] h-full bg-white bg-opacity-95" />
                        <div className="w-[1.5px] h-full bg-white bg-opacity-95" />
                        <div className="w-[3.2px] h-full bg-white bg-opacity-95" />
                        <div className="w-[1px] h-full bg-white bg-opacity-95" />
                        <div className="w-[2px] h-full bg-white bg-opacity-95" />
                        <div className="w-[1.5px] h-full bg-white bg-opacity-95" />
                        <div className="w-[3px] h-full bg-white bg-opacity-95" />
                      </div>
                      <span className="text-[6.5px] text-slate-400 font-mono tracking-widest mt-1">SECURED BY AETHER INTERNALS</span>
                    </div>

                  </motion.div>

                  <button
                    onClick={handleResetCheckout}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-950 py-3.5 text-[10px] font-black text-white hover:bg-slate-900 hover:shadow-md transition-all duration-300 cursor-pointer"
                  >
                    <span>العودة لمتابعة التسوق الفاخر</span>
                  </button>
                </motion.div>
              ) : cartItems.length > 0 ? (
                /* قائمة عناصر السلة الفعالة (Active items list) */
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <motion.div
                      layout
                      key={item.product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs hover:border-sky-200 transition-all duration-300"
                    >
                      {/* صورة المنتج */}
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-50 border border-slate-100">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="h-full w-full object-cover object-center"
                        />
                      </div>

                      {/* التفاصيل والتحكم */}
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="text-[11px] font-black text-slate-950 line-clamp-1">
                              {item.product.name}
                            </h4>
                            <button
                              onClick={() => onRemoveItem(item.product.id)}
                              className="text-slate-400 hover:text-rose-500 p-0.5 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                              title="حذف الكل"
                              id={`remove-item-${item.product.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-1 font-bold">
                            الفئة: {item.product.category}
                          </span>
                        </div>

                        {/* تحكم الكمية والأسعار */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-0.5 rounded-xl border border-slate-200/60 p-0.5 bg-slate-50">
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                              className="h-6 w-6 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-xs transition-all cursor-pointer"
                              id={`decrease-qty-${item.product.id}`}
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </button>
                            <span className="w-6 text-center text-[11px] font-black text-slate-800 font-mono">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                              className="h-6 w-6 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-xs transition-all cursor-pointer"
                              id={`increase-qty-${item.product.id}`}
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                          </div>
                          <span className="text-xs font-black text-slate-900 font-mono">
                            ${(item.product.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                /* واجهة السلة الفارغة (Empty Cart state) */
                <div className="flex h-full flex-col items-center justify-center text-center py-10">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 mb-4 animate-bounce">
                    <ShoppingBag className="h-6 w-6 text-slate-400" />
                  </div>
                  <h3 className="text-xs font-black text-slate-950">سلتك لا تزال فارغة!</h3>
                  <p className="mt-1.5 text-[10px] text-slate-400 max-w-xs leading-relaxed font-bold">
                    يبدو أنك لم تقم بإضافة أي منتج لسلّتك بعد. تصفح المتجر وأضف معروضاتك المفضلة!
                  </p>
                </div>
              )}
            </div>

            {/* الحساب النهائي والمجموع (Footer) */}
            {!checkoutSuccess && cartItems.length > 0 && (
              <div className="border-t border-slate-150 p-6 bg-slate-50/80 backdrop-blur-md">
                {/* ملخص التسعير */}
                <div className="space-y-2 mb-4.5">
                  <div className="flex justify-between text-[11px] text-slate-400 font-black">
                    <span>مجموع المنتجات:</span>
                    <span className="font-mono text-slate-700">
                      {cartItems.reduce((acc, curr) => acc + curr.quantity, 0)} قطع
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-black">
                    <span>الشحن والتوصيل:</span>
                    <span className="text-emerald-500 font-black">توصيل مجاني فائق السرعة</span>
                  </div>
                  <div className="flex justify-between text-xs font-black text-slate-900 pt-3 border-t border-dashed border-slate-200">
                    <span>الإجمالي الكلي:</span>
                    <span className="text-base text-slate-950 font-mono">${totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* أزرار السلوك الفعلي للكلاس */}
                <div className="flex flex-col gap-2">
                  <CheckoutProcess onSuccess={() => setCheckoutSuccess(true)} />

                  <button
                    onClick={onClearCart}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-[10px] font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-50/50 hover:border-rose-200 transition-all duration-300 cursor-pointer"
                    id="clear-cart-btn"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>تفريغ السلة بالكامل</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
