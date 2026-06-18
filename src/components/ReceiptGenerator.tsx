/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Sparkles, Shield, Cpu, RefreshCw, Calendar, User, Mail, DollarSign, Award } from 'lucide-react';
import { CartItem } from '../types';

interface ReceiptGeneratorProps {
  cartItems: CartItem[];
  totalAmount: number;
  transactionId: string;
  orderId: string;
  date: string;
  buyerName: string;
  buyerEmail: string;
  onClose: () => void;
}

/**
 * ReceiptGenerator Component
 * 
 * [مخطط النشاط - Activity Diagram: Fork & Join Integration]
 * يمثل هذا المكون نقطة الدمج (Join) لبيانات المعاملة الواردة من جانب الخادم (Backend Transaction ID)
 * وبيانات العرض من جانب المستخدم (Frontend Styling Grid) لتشكيل الإيصال النهائي الموحد الفاخر.
 */
export default function ReceiptGenerator({
  cartItems,
  totalAmount,
  transactionId,
  orderId,
  date,
  buyerName,
  buyerEmail,
  onClose,
}: ReceiptGeneratorProps) {

  // تنسيق التاريخ والوقت بشكل جمالي عربي
  const formattedDate = new Date(date).toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });

  return (
    <div className="relative w-full max-w-lg mx-auto overflow-hidden rounded-3xl border border-slate-200/50 bg-white/90 p-1 shadow-[0_24px_64px_rgba(9,13,22,0.12)] backdrop-blur-xl transition-all duration-500" dir="rtl">
      
      {/* 
        [طبقة العرض - Presentation Layer: Cosmic Grid Backdrop]
        شبكة هندسية خلفية ناعمة مصممة بأسلوب مصفوفة فضاء إحداثية مستوحاة من التصورات المعمارية لآبل
      */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.14]" id="cosmic-grid-overlay">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-500" />
            </pattern>
            <radialGradient id="glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#090d16" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <rect width="100%" height="100%" fill="url(#glow)" />
        </svg>
      </div>

      {/* المحتوى الفعلي المدمج بعناية فائقة */}
      <div className="relative z-10 p-6 sm:p-8 flex flex-col justify-between h-full">
        
        {/* الحفّاز الفخيم للأعلى: هالة التأكيد والأوسمة */}
        <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100/80">
          <div className="relative mb-6">
            
            {/* 
              [مخطط الحالات البصرية: Orbital Gears Animation]
              طبقات هندسية دوّارة متداخلة تحاكي خوارزميات التشفير والدقة الحسابية للبيانات
            */}
            <div className="absolute inset-0 flex items-center justify-center -m-6 z-0">
              {/* الترس أو الحلقة الأولى: اتجاه عقارب الساعة */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 16, ease: "linear" }}
                className="w-24 h-24 rounded-full border border-dashed border-emerald-400/40 flex items-center justify-center"
              />
              {/* الحلقة الثانية المتداخلة: عكس اتجاه عقارب الساعة */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 24, ease: "linear" }}
                className="absolute w-30 h-30 rounded-full border border-dotted border-indigo-400/30"
              />
              {/* الحلقة الثالثة الطرفية: مصفوفة المسار الهوائي الدقيق */}
              <motion.div
                animate={{ rotate: 180 }}
                transition={{ repeat: Infinity, duration: 32, ease: "linear" }}
                className="absolute w-36 h-36 rounded-full border border-dashed border-sky-400/20"
              />
            </div>

            {/* الهالة المتوهجة خلف أيقونة التأكيد */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500/10 via-indigo-500/10 to-sky-500/10 blur-2xl transform scale-125 z-0" />
            
            {/* أيقونة النجاح الأساسية مع نبضات رقيقة */}
            <motion.div
              initial={{ scale: 0.3, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-sky-400 text-white shadow-[0_12px_24px_rgba(16,185,129,0.25)] border border-emerald-300/20"
            >
              <CheckCircle className="h-9 w-9" />
            </motion.div>

            {/* نثار مبرمج من الـ Sparkles */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1], opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="absolute -top-3 -right-3 bg-gradient-to-br from-amber-400 to-orange-500 p-2 rounded-xl text-slate-950 shadow-md border border-amber-300/35"
            >
              <Sparkles className="h-4 w-4 animate-pulse text-white" />
            </motion.div>
          </div>

          <h3 className="text-lg font-black text-slate-950 font-display tracking-tight leading-none">
            توثيق معاملة الشراء الفاخرة
          </h3>
          <p className="mt-2 text-[11px] text-slate-400 max-w-xs font-bold leading-relaxed">
            تمت المصادقة الثنائية على طلبك الرقمي عبر نظام <span className="text-slate-800 font-extrabold font-display">أثِير سيلكت</span> للهندسة المعمارية التفاعلية.
          </p>
        </div>

        {/* المكون التحليلي الوسطي: بيانات المستخدم والمعاملة */}
        <div className="my-6 space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100/80">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-1 flex items-center gap-1">
                <User className="h-3 w-3 text-sky-500" />
                العميل المفوض
              </span>
              <span className="text-xs font-black text-slate-850 truncate block">{buyerName}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100/80">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-1 flex items-center gap-1">
                <Mail className="h-3 w-3 text-indigo-500" />
                عنوان الجلسة
              </span>
              <span className="text-xs font-medium text-slate-550 truncate block font-mono hover:text-slate-900 transition-colors">{buyerEmail}</span>
            </div>
          </div>

          {/* تذكرة المعاملة المعتمدة فنيًا */}
          <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50/40 to-white p-4.5 space-y-3 shadow-xs">
            {/* مؤشر ترخيص الـ JWT */}
            <div className="flex items-center justify-between text-[11px] border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
                <span>حالة الجلسة والتوثيق</span>
              </div>
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 rounded-lg px-2 py-0.5 text-[9px] font-black font-sans">
                جلسة JWT موثقة ونشطة
              </span>
            </div>

            {/* تفاصيل الرقم التسلسلي ورقم المعاملة */}
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold">معرّف الطلب (Order ID):</span>
                <span className="font-mono font-black text-slate-800">{orderId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold">رقم المعاملة (Transaction ID):</span>
                <span className="font-mono font-black text-sky-600 bg-sky-50/50 px-2 py-0.5 rounded-md border border-sky-100/50">{transactionId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold">تاريخ الاعتماد:</span>
                <span className="text-slate-755 font-bold">{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* قائمة العناصر في الإيصال */}
          <div className="rounded-2xl border border-slate-150 bg-slate-50/30 p-2 max-h-36 overflow-y-auto">
            <span className="block text-[8.5px] uppercase tracking-wider text-slate-400 font-extrabold px-3 py-1 bg-slate-100/50 rounded-lg mb-2">العناصر المضمنة بالمعاملة البرمجية:</span>
            <div className="space-y-1.5">
              {cartItems.map((item) => (
                <div key={item.product.id} className="flex justify-between items-center px-3 py-1 text-xs text-slate-700 font-bold hover:bg-white/80 rounded-xl transition-all duration-200">
                  <span className="line-clamp-1 flex-grow pr-2 font-medium">
                    💎 {item.product.name} <span className="font-mono text-slate-400 text-[10px]">({item.quantity}x)</span>
                  </span>
                  <span className="font-mono text-slate-900 shrink-0 font-bold">${(item.product.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* حساب القيمة النهائية */}
          <div className="pt-3 border-t border-dashed border-slate-200 space-y-1">
            <div className="flex justify-between text-[11px] font-black text-slate-500">
              <span>بروتوكول الأمان المالي:</span>
              <span className="text-slate-800 font-mono text-[10px] flex items-center gap-1">
                <Cpu className="h-3 w-3 text-indigo-500" /> AES-256 Bit Encryption
              </span>
            </div>
            <div className="flex justify-between text-xs font-black text-slate-950 pt-2.5 border-t border-slate-100 mt-2">
              <span className="text-sm font-black">القيمة الصافية المدفوعة:</span>
              <span className="text-emerald-600 font-mono text-lg font-black">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* 
          [طبقة العرض الفنية: Barcode Module & Scanner Scanline]
          الرمز الشريطي والماسح المبرمج لإبراز هوية المتاجرة الحديثة الرفيعة
        */}
        <div className="mt-4 flex flex-col items-center justify-center relative overflow-hidden p-4 rounded-2xl bg-slate-50 border border-slate-150" id="barcode-section">
          {/* محاكاة شعاع الليزر الخاص بماسح الباركود بلونه المتوهج السماوي */}
          <motion.div
            animate={{ 
              top: ["10%", "90%", "10%"] 
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 3, 
              ease: "easeInOut" 
            }}
            className="absolute left-4 right-4 h-[1.5px] bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_12px_#38bdf8] z-20 pointer-events-none"
          />

          {/* أعمدة الباركود مرسومة بدقة هندسية بصرية */}
          <div className="h-10 w-52 bg-slate-900/90 rounded-sm flex items-center justify-between px-3 py-1 relative z-10 overflow-hidden shadow-inner">
            <div className="w-[1px] h-full bg-white/90" />
            <div className="w-[3px] h-full bg-white/95" />
            <div className="w-[1.5px] h-full bg-white/90" />
            <div className="w-[0.5px] h-full bg-white/80" />
            <div className="w-[2px] h-full bg-white/95" />
            <div className="w-[1.2px] h-full bg-white/90" />
            <div className="w-[4px] h-full bg-white/95" />
            <div className="w-[1.5px] h-full bg-white/90" />
            <div className="w-[0.5px] h-full bg-white/85" />
            <div className="w-[2.5px] h-full bg-white/95" />
            <div className="w-[1px] h-full bg-white/90" />
            <div className="w-[3.2px] h-full bg-white/95" />
            <div className="w-[1.8px] h-full bg-white/90" />
            <div className="w-[0.5px] h-full bg-white/80" />
            <div className="w-[3px] h-full bg-white/95" />
            <div className="w-[1px] h-full bg-white/90" />
            <div className="w-[4.2px] h-full bg-white/95" />
            <div className="w-[1.5px] h-full bg-white/90" />
            <div className="w-[2px] h-full bg-white/95" />
            <div className="w-[1px] h-full bg-white/90" />
          </div>
          <span className="text-[7.5px] text-slate-400 font-mono tracking-[0.25em] mt-2 block select-none">
            {transactionId}
          </span>
        </div>

        {/* زر إغلاق الإيصال وتأكيد العودة */}
        <button
          onClick={onClose}
          className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 text-xs font-black text-white hover:bg-slate-900 hover:shadow-lg hover:shadow-slate-900/10 active:scale-[0.98] transition-all duration-300 cursor-pointer"
        >
          <Award className="h-4 w-4 text-sky-400" />
          <span>العودة لإمبراطورية أثِير سيلكت</span>
        </button>

      </div>
    </div>
  );
}
