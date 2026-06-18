/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Mail, Key, User, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { authService } from '../services/api';
import { useAuth } from '../context/AppContext';

export default function AuthModal() {
  const { isAuthOpen: isOpen, setIsAuthOpen, handleAuthSuccess: onSuccess } = useAuth();
  const onClose = () => setIsAuthOpen(false);
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      let data;
      if (isLogin) {
        data = await authService.login({ email, password });
      } else {
        data = await authService.register({ name, email, password });
      }
      
      if (data.success) {
        setSuccessMsg(isLogin ? "تم تسجيل الدخول بنجاح!" : "تم إنشاء الحساب بنجاح!");
        setTimeout(() => {
          onSuccess(data.token, data.user);
          // تفريغ الحقول وإغلاق
          setEmail('');
          setPassword('');
          setName('');
          onClose();
          setSuccessMsg('');
        }, 1000);
      } else {
        setError(data.message || "حدث خطأ ما أثناء معالجة الطلب.");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        "فشل الاتصال بالخادم. يرجى التأكد من تشغيل خادم Express وتجربة ملء الحقول مجددًا."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* الخلفية المظلمة */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-3xs"
          />

          {/* الكرت الحواري المصمم بعناية */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white border border-gray-150 shadow-2xl flex flex-col"
              dir="rtl"
            >
              {/* الترويسة */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-sky-500 animate-pulse" />
                  <h3 className="text-xs font-black text-slate-950 font-display">
                    {isLogin ? "بوابة تسجيل الدخول الآمن" : "إنشاء نموذج مستخدم جديد"}
                  </h3>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-150 hover:text-slate-8 w-7 h-7 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* الاستمارة */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                
                {/* مفتاح التبديل الأنيق بين تسجيل دخول/إنشاء حساب */}
                <div className="flex rounded-xl bg-slate-100 p-0.5 border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => { setIsLogin(true); setError(''); }}
                    className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all duration-300 cursor-pointer ${
                      isLogin ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    تسجيل الدخول
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsLogin(false); setError(''); }}
                    className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all duration-300 cursor-pointer ${
                      !isLogin ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    حساب جديد
                  </button>
                </div>

                {/* إشعار الخطأ */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-[10px] font-bold flex items-start gap-2"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                      <div>{error}</div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* إشعار النجاح */}
                <AnimatePresence>
                  {successMsg && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-[10px] font-bold flex items-start gap-2"
                    >
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                      <div>{successMsg}</div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* حقل الاسم (فقط للـ Register) */}
                {!isLogin && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-[10px] font-black text-slate-500">اسم المستخدم ثنائي / ثلاثي</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="أدخل اسمك الفعلي (بالعربية أو الإنجليزية)"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full rounded-xl border border-slate-200 bg-white py-3 pr-10 pl-3.5 text-[11px] font-bold text-slate-900 placeholder-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* حقل البريد الإلكتروني */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500">البريد الإلكتروني</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="student@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-white py-3 pr-10 pl-3.5 text-[11px] font-bold text-slate-900 placeholder-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* حقل كلمة المرور */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500">كلمة المرور المشفرة</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      <Key className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-white py-3 pr-10 pl-3.5 text-[11px] font-bold text-slate-900 placeholder-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* زر الإرسال والحماية */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-xl bg-slate-950 py-3 text-[11px] font-black text-white shadow-md hover:bg-slate-800 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <span>{isLogin ? "تفويض الدخول ببيانات اعتماد JWT" : "حفظ الحساب وتشفير كلمة المرور"}</span>
                  )}
                </button>
                
                {/* توضيح تدريس المادة الأكاديمية */}
                <p className="text-[10px] text-center text-slate-400 leading-relaxed font-bold mt-1">
                  المصادقة محمية تماماً باستخدام <strong className="text-slate-600">JWT & bcryptjs</strong> على الجانب الخلفي من Node.js.
                </p>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
