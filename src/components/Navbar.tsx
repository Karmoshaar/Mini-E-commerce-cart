import React from 'react';
import { ShoppingBag, Sparkles, LogOut, Sliders } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../context/AppContext';

export default function Navbar() {
  const { 
    totalItemsCount: cartItemCount, 
    setIsCartOpen, 
    user, 
    handleLogout: onLogout, 
    setIsAuthOpen, 
    isAdminPanelOpen, 
    setIsAdminPanelOpen 
  } = useStore();

  const isUserAdmin = user?.email?.toLowerCase() === 'karmoshaar@gmail.com';

  const onOpenCart = () => setIsCartOpen(true);
  const onOpenAuth = () => setIsAuthOpen(true);
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-md shadow-[0_2px_12px_-4px_rgba(15,23,42,0.02)]">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-6 sm:px-8 lg:px-10" dir="rtl">
        
        {/* شعار المتجر (Store Logo) - بلمسة عصرية مبتكرة تليق بـ Apple UX المعياري */}
        <motion.div 
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3.5 group"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.06),inset_0_1.5px_0_rgba(255,255,255,0.9)] relative overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:border-sky-300 group-hover:shadow-[0_4px_16px_rgba(14,165,233,0.12)]">
            {/* توهج خلفية اللوغو - كاشف ومضاء لمظهر الأناقة الكونية */}
            <div className="absolute inset-0 bg-gradient-to-tr from-sky-400/15 via-slate-50 to-indigo-500/15 opacity-70 pointer-events-none" />
            
            {/* الشعار المتجهي فائق الدقة المانع للتبييض أو التغبيش مع ألوان غنية عالية التباين وبراقة */}
            <svg viewBox="0 0 100 100" className="h-7 w-7 relative z-10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0284c7" /> {/* Sky 600 - غني جداً وواضح */}
                  <stop offset="50%" stopColor="#4f46e5" /> {/* Indigo 600 - مشبع */}
                  <stop offset="100%" stopColor="#059669" /> {/* Emerald 600 - ساطع */}
                </linearGradient>
                {/* ظل خفيف للنجمة ليجعلها ثلاثية الأبعاد وواضحة جداً كإحدى واجهات Apple */}
                <filter id="starShadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#0f172a" floodOpacity="0.12" />
                </filter>
              </defs>
              
              {/* حلقة مدارية منقطة واضحة وخارجية تعتمد على CSS للدوران */}
              <circle 
                cx="50" 
                cy="50" 
                r="38" 
                stroke="url(#logoGrad)" 
                strokeWidth="4.5" 
                strokeDasharray="8 6" 
                className="opacity-75 animate-logo-orbit"
              />

              {/* حلقة مدارية داخلية تزيد من العمق التقني للفيكتور */}
              <circle 
                cx="50" 
                cy="50" 
                r="26" 
                stroke="url(#logoGrad)" 
                strokeWidth="3" 
                className="opacity-45" 
              />

              {/* النواة على شكل بريق كوني متجهي دقيق دائم النبض وبأعلى مستويات الوضوح بالظل والأنيميشن النظيف */}
              <path 
                d="M50 18 L57 43 L82 50 L57 57 L50 82 L43 57 L18 50 L43 43 Z" 
                fill="url(#logoGrad)"
                filter="url(#starShadow)"
                className="animate-logo-star"
              />
            </svg>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-slate-900 font-display leading-none">أثِير</span>
              <span className="text-[9.5px] font-extrabold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100/80 uppercase tracking-wider font-mono">SELECT</span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wide leading-none mt-1.5 md:block hidden">
              الأبعاد الفنية للفخامة التقنية المبتكرة
            </p>
          </div>
        </motion.div>

        {/* أزرار التنقل والتحكم - طراز مينيماليزم فاخر (Apple-Style AppBar) */}
        <div className="flex items-center gap-3">
          {/* قسم المستخدم المصادق (JWT User Section) */}
          {user ? (
            <div className="flex items-center gap-2.5">
              {isUserAdmin && (
                <button
                  onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-300 active:scale-95 cursor-pointer shadow-xs ${
                    isAdminPanelOpen 
                      ? 'bg-slate-900 text-white border border-slate-800' 
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-800 hover:text-slate-950'
                  }`}
                  title="لوحة تحكم المدير"
                >
                  <Sliders className="h-3.5 w-3.5 text-sky-500" />
                  <span>{isAdminPanelOpen ? 'إغلاق لوحة المسؤول' : 'لوحة المسؤول'}</span>
                </button>
              )}
              
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/40 rounded-xl px-3 py-1.5 text-slate-700">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-bold text-slate-900">{user.name}</span>
              </div>
              
              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50/70 rounded-xl transition-all cursor-pointer"
                title="تسجيل الخروج"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-700 shadow-xs hover:border-slate-900 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span>تسجيل الدخول</span>
            </button>
          )}

          <button 
            onClick={onOpenCart}
            className="group relative flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 cursor-pointer shadow-sm transition-all duration-300"
            id="open-cart-btn"
          >
            {/* أيقونة سلة التسوق المضاءة */}
            <ShoppingBag className="h-4.5 w-4.5 text-sky-400 transition-transform duration-300 group-hover:scale-105" />
            <span className="font-semibold text-[12px] hidden sm:inline">سلة المشتريات</span>
            
            {/* عداد المنتجات الديناميكي (Dynamic Count Badge) */}
            <AnimatePresence mode="popLayout">
              {cartItemCount > 0 && (
                <motion.span
                  key={cartItemCount}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                  className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-sky-500 px-1.5 text-[10px] font-bold text-white shadow-xs"
                >
                  {cartItemCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </header>
  );
}
