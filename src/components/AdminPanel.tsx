/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, Layers, Users, BarChart3, Plus, Trash2, Sparkles, 
  AlertCircle, Image, UserCheck, Calendar, DollarSign, 
  Folder, Heart, RefreshCw, Star, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../context/AppContext';
import { adminService } from '../services/api';
import { Product, User } from '../types';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// قائمة ببعض الصور الجاهزة فائقة الجمال للإضاءة الـ RGB والنيون لتسهيل التجربة
const IMAGE_PRESETS = [
  {
    name: "إضاءة نيون RGB خطية",
    url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80",
    category: "إلكترونيات"
  },
  {
    name: "لوحة جدارية نيون ملونة",
    url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80",
    category: "إلكترونيات"
  },
  {
    name: "غرفة ألعاب تفاعلية مضيئة",
    url: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=850&auto=format&fit=crop&q=80",
    category: "إلكترونيات"
  },
  {
    name: "شريط نيون مرن كوزميك",
    url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80",
    category: "إلكترونيات"
  },
  {
    name: "مصباح نيون هندسي مستقبلي",
    url: "https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?w=800&auto=format&fit=crop&q=80",
    category: "إلكترونيات"
  },
  {
    name: "إعداد مكتب نيون غامق",
    url: "https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800&auto=format&fit=crop&q=80",
    category: "إلكترونيات"
  }
];

export default function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const { products, refreshProducts, showToast, user } = useStore();
  const [activeTab, setActiveTab] = useState<'catalog' | 'add' | 'users' | 'analytics'>('catalog');
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: number; name: string } | null>(null);

  // حقول إضافة منتج جديد (Add Product Fields)
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('إلكترونيات');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductOriginalPrice, setNewProductOriginalPrice] = useState('');
  const [newProductImage, setNewProductImage] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');

  // جلب المستخدمين عند التبديل لتبويب المستخدمين أو تشغيل اللوحة
  useEffect(() => {
    if (isOpen && activeTab === 'users') {
      fetchUsers();
    }
  }, [isOpen, activeTab]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const data = await adminService.getUsers();
      if (data.success && Array.isArray(data.users)) {
        setUsersList(data.users);
      }
    } catch (err) {
      console.error("Error loading users database:", err);
      showToast("خطأ: تعذر تحميل قاعدة بيانات العملاء.");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice || !newProductImage || !newProductDescription) {
      showToast("يرجى ملء جميع الحقول المطلوبة باللون الأحمر.");
      return;
    }

    const priceNum = parseFloat(newProductPrice);
    const origPriceNum = newProductOriginalPrice ? parseFloat(newProductOriginalPrice) : undefined;

    if (isNaN(priceNum) || priceNum <= 0) {
      showToast("يرجى إدخال سعر مالي صالح لعملية الإنتاج.");
      return;
    }

    setIsSubmittingProduct(true);
    try {
      const resp = await adminService.addProduct({
        name: newProductName,
        price: priceNum,
        originalPrice: origPriceNum,
        category: newProductCategory,
        image: newProductImage,
        description: newProductDescription,
        rating: 4.8
      });

      if (resp.success) {
        showToast("✓ تم إضافة منتجك النيون الجديد بنجاح إلى منصة العرض!");
        // تصفير الحقائب
        setNewProductName('');
        setNewProductPrice('');
        setNewProductOriginalPrice('');
        setNewProductImage('');
        setNewProductDescription('');
        await refreshProducts();
        setActiveTab('catalog'); // ارجع لجدول الكتالوج
      } else {
        showToast(`خطأ في العملية: ${resp.message}`);
      }
    } catch (err: any) {
      console.error("Error submitting product:", err);
      showToast(err.response?.data?.message || "تعذر إرسال الطلب، هل تملك صكوك المسؤول؟");
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      const resp = await adminService.deleteProduct(productToDelete.id);
      if (resp.success) {
        showToast("✓ تم إتلاف وحذف المنتج ومسحه من الكتالوج بأمان.");
        await refreshProducts();
      } else {
        showToast(`فشلت الإزالة: ${resp.message}`);
      }
    } catch (err) {
      console.error("Error deleting catalog product:", err);
      showToast("خطأ: تعذر إنهاء دورة حياة هذا المنتج، تواصل مع فريق المراقبة.");
    } finally {
      setProductToDelete(null);
    }
  };

  // إحصائيات لوحة التحكم
  const totalCatalogPrice = products.reduce((acc, p) => acc + p.price, 0);
  const avgProductPrice = products.length > 0 ? (totalCatalogPrice / products.length).toFixed(1) : '0';

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: -25 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -25 }}
      transition={{ type: 'spring', damping: 25, stiffness: 180 }}
      className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl w-full max-w-7xl shadow-[0_12px_40px_rgba(15,23,42,0.08)] overflow-hidden flex flex-col relative"
    >
          {/* ترويسة لوحة التحكم */}
          <div className="bg-slate-950 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-sky-400 to-indigo-500 p-2 rounded-xl text-slate-950">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold flex items-center gap-2">
                  <span>أثير سيلكت • لوحة التحكم الفخرية</span>
                  <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">بطل الإدارة</span>
                </h2>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  المطور والمسؤول الفخري: <strong className="text-sky-300">{user?.name}</strong> ({user?.email})
                </span>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-slate-800 rounded-xl transition-all border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* تبويبات التنقل */}
          <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2 px-6 py-4.5 text-xs font-black transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'catalog' 
                  ? 'border-slate-950 text-slate-950 bg-white' 
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>إدارة كتالوج المنتجات ({products.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('add')}
              className={`flex items-center gap-2 px-6 py-4.5 text-xs font-black transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'add' 
                  ? 'border-slate-950 text-slate-950 bg-white' 
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>إضافة منتج نيون جديد</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-6 py-4.5 text-xs font-black transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'users' 
                  ? 'border-slate-950 text-slate-950 bg-white' 
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>قاعدة بيانات العملاء ({usersList.length || '...'})</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-6 py-4.5 text-xs font-black transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'analytics' 
                  ? 'border-slate-950 text-slate-950 bg-white' 
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>المؤشرات والإحصائيات</span>
            </button>
          </div>

          {/* محتويات التبويبات */}
          <div className="flex-1 p-6 overflow-y-auto bg-slate-50/30">
            {/* التبويب الأول: إدارة الكتالوج */}
            {activeTab === 'catalog' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-950 flex items-center gap-2">
                    <span>قائمة المنتجات الحالية بالمعرض</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </h3>
                  <button 
                    onClick={refreshProducts}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-[10px] font-black text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>تحديث القائمة</span>
                  </button>
                </div>

                <div className="border border-slate-200/80 rounded-2xl bg-white overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-3.5">المنتج</th>
                          <th className="px-5 py-3.5">الفئة</th>
                          <th className="px-5 py-3.5">السعر المعروض</th>
                          <th className="px-5 py-3.5 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {products.map((pub) => (
                          <tr key={pub.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3 flex items-center gap-3">
                              <img 
                                src={pub.image} 
                                alt={pub.name} 
                                className="h-10 w-10.5 rounded-lg object-cover border border-slate-200" 
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <span className="font-bold text-slate-950 block text-[11px]">{pub.name}</span>
                                <span className="text-[9px] text-slate-400 line-clamp-1 block mt-0.5 max-w-sm">{pub.description}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-[10px] font-bold text-slate-700">
                                {pub.category}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <div className="font-extrabold text-slate-950">
                                ${pub.price} {pub.originalPrice && <span className="text-[10px] text-slate-400 font-normal line-through mr-1">${pub.originalPrice}</span>}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <button
                                onClick={() => setProductToDelete({ id: pub.id, name: pub.name })}
                                className="p-1.5 rounded-lg text-slate-450 hover:text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
                                title="إتلاف المنتج"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* التبويب الثاني: إضافة منتج جديد */}
            {activeTab === 'add' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* استمارة الإرسال */}
                <form onSubmit={handleAddProduct} className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
                  <h3 className="text-xs font-black text-slate-950">مواصفات وتفاضيل المنتج الجديد</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500">اسم المنتج <span className="text-rose-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        placeholder="مثال: لوحة نيون غيم ريترو"
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-slate-950 focus:border-slate-950 focus:outline-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500">فئة التصنيف <span className="text-rose-500">*</span></label>
                      <select 
                        value={newProductCategory}
                        onChange={(e) => setNewProductCategory(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-slate-950 focus:outline-hidden bg-white font-bold"
                      >
                        <option value="إلكترونيات">إلكترونيات</option>
                        <option value="برمجيات">برمجيات</option>
                        <option value="ترميم وغرف">ترميم وغرف</option>
                        <option value="إضاءة عصرية">إضاءة عصرية</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500">سعر البيع النهائي ($) <span className="text-rose-500">*</span></label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        value={newProductPrice}
                        onChange={(e) => setNewProductPrice(e.target.value)}
                        placeholder="مثال: 45"
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-slate-950 focus:outline-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500">السعر الأصلي قبل الخصم ($)</label>
                      <input 
                        type="number"
                        min="1"
                        value={newProductOriginalPrice}
                        onChange={(e) => setNewProductOriginalPrice(e.target.value)}
                        placeholder="اختياري (سعر المقارنة)"
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-slate-950 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500">عنوان URL لصورة المنتج <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <input 
                        type="url" 
                        required
                        value={newProductImage}
                        onChange={(e) => setNewProductImage(e.target.value)}
                        placeholder="أدخل رابط أو اختر من القوالب السريعة باليسار"
                        className="w-full border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-xs focus:ring-1 focus:ring-slate-950 focus:outline-hidden font-mono"
                      />
                      <Image className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500">الوصف التفصيلي والتقني للمنتج <span className="text-rose-500">*</span></label>
                    <textarea 
                      required
                      rows={3}
                      value={newProductDescription}
                      onChange={(e) => setNewProductDescription(e.target.value)}
                      placeholder="اشرح ميزات المنتج ومواصفاته بالتفصيل لإغراء زوار متجر أثير سيلكت..."
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-slate-950 focus:outline-hidden resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingProduct}
                    className="w-full bg-slate-950 text-white rounded-xl py-3 px-4 text-xs font-black hover:bg-slate-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmittingProduct ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    <span>{isSubmittingProduct ? "جاري إنتاج المنتج في الخادم..." : "نشر المنتج فوراً بالمتجر"}</span>
                  </button>
                </form>

                {/* اقتراحات الصور الذكية */}
                <div className="space-y-3.5">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <h4 className="text-[11px] font-black text-slate-950 flex items-center gap-1.5 mb-2">
                      <Sparkles className="h-4 w-4 text-sky-500" />
                      <span> presets صور نيون جاهزة</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-normal mb-3">
                      قم بزيادة سرعة التجارب عن طريق الضغط على الفخامة أدناه لملء رابط الصورة فوراً.
                    </p>

                    <div className="grid grid-cols-2 gap-2.5">
                      {IMAGE_PRESETS.map((pst, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setNewProductImage(pst.url);
                            if (!newProductName) setNewProductName(pst.name);
                          }}
                          className="group relative rounded-xl overflow-hidden aspect-video border border-slate-250 cursor-pointer hover:border-slate-800 transition-colors"
                        >
                          <img 
                            src={pst.url} 
                            alt={pst.name} 
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/40 p-1.5 text-[8px] font-black text-white text-center">
                            {pst.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-sky-50 border border-sky-200/50 rounded-2xl p-4 text-sky-850 flex items-start gap-2.5">
                    <Info className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
                    <div className="text-[9.5px] leading-relaxed">
                      <span className="font-black block mb-0.5">تعليمات الأمان</span>
                      عند النشر، سيتم تخزين المنتج فوراً وبشكل مستديم داخل قاعدة البيانات الحالية، ويمكن حذفه بأي وقت.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* التبويب الثالث: قاعدة بيانات المشتركين */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-950">قائمة الأعضاء والمطورين المسجلين بالمنصة</h3>
                  <button 
                    onClick={fetchUsers}
                    disabled={isLoadingUsers}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-[10px] font-black text-slate-705 bg-white hover:bg-slate-50 transition-colors shadow-xs"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                    <span>تحديث البيانات</span>
                  </button>
                </div>

                {isLoadingUsers ? (
                  <div className="text-center py-12 flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="h-6 w-6 text-slate-500 animate-spin" />
                    <span className="text-[10px] text-slate-400 font-bold">جاري تحميل مستندات الأمن القومي والمسؤولية...</span>
                  </div>
                ) : (
                  <div className="border border-slate-200/80 rounded-2xl bg-white overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="px-5 py-3.5">الاسم</th>
                            <th className="px-5 py-3.5">البريد الإلكتروني</th>
                            <th className="px-5 py-3.5">الدور البرمجي</th>
                            <th className="px-5 py-3.5">تاريخ الانضمام</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {usersList.map((usr, index) => {
                            const isUserAdmin = usr.email?.toLowerCase() === 'karmoshaar@gmail.com';
                            return (
                              <tr key={usr.id || index} className={`hover:bg-slate-50/50 transition-colors ${isUserAdmin ? 'bg-amber-50/20' : ''}`}>
                                <td className="px-5 py-4">
                                  <span className="font-bold text-slate-950 text-[11px] flex items-center gap-2">
                                    {usr.name}
                                    {isUserAdmin && (
                                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                    )}
                                  </span>
                                </td>
                                <td className="px-5 py-4 font-mono text-slate-600">{usr.email || '—'}</td>
                                <td className="px-5 py-4">
                                  {isUserAdmin ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-300 text-[10px] bg-amber-100/60 text-amber-800 font-black">
                                      <Star className="h-3 w-3 text-amber-500 animate-pulse" />
                                      <span>المسؤول والمهندس الرئيسي</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-200 text-[10px] bg-slate-50 text-slate-650 font-bold">
                                      <UserCheck className="h-3 w-3 text-emerald-500" />
                                      <span>عضو مسجل بالمنصة</span>
                                    </span>
                                  )}
                                </td>
                                <td className="px-5 py-4 text-slate-400 font-mono text-[10px]">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{usr.createdAt ? new Date(usr.createdAt).toLocaleDateString('ar-SY') : 'سابق مسبقاً'}</span>
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* التبويب الرابع: الإحصائيات الفخرية */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                {/* بطاقات المؤشرات الأساسية */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-2 relative overflow-hidden">
                    <div className="h-10 w-10.5 rounded-xl bg-sky-50 flex items-center justify-center text-sky-500">
                      <Folder className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wide">إجمالي منتجات الكتالوج</span>
                    <h3 className="text-3xl font-black text-slate-950">{products.length}</h3>
                    <p className="text-[9.5px] text-slate-400">كامل البضائع الحية المتاحة بالمتجر للعرض والتفاعل الإلكتروني.</p>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-2 relative overflow-hidden">
                    <div className="h-10 w-10.5 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                      <Users className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wide">العملاء والمهندسين النشطين</span>
                    <h3 className="text-3xl font-black text-slate-950">{usersList.length || '3'}</h3>
                    <p className="text-[9.5px] text-slate-400">عدد المستخدمين المصادقين الحاصلين على تراخيص مفاتيح JWT.</p>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-2 relative overflow-hidden">
                    <div className="h-10 w-10.5 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wide">متوسط سعر المنتجات النيون</span>
                    <h3 className="text-3xl font-black text-slate-950">${avgProductPrice}</h3>
                    <p className="text-[9.5px] text-slate-400">متوسط القيمة التسعيرية للإضاءات والنيون لتناسب رواد الأعمال.</p>
                  </div>
                </div>

                {/* هيكل المساهمة الفنية وعمل الفريق */}
                <div className="bg-slate-950 text-white p-6 rounded-3xl relative overflow-hidden border border-slate-800">
                  <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-sky-500/10 blur-3xl" />
                  <div className="absolute left-1/3 bottom-0 h-48 w-48 rounded-full bg-indigo-600/10 blur-3xl" />
                  
                  <div className="relative space-y-4 max-w-2xl">
                    <span className="text-[9px] uppercase tracking-[0.2em] font-black text-sky-400 bg-sky-400/10 border border-sky-400/20 px-3 py-1 rounded-full inline-block">
                      تفاضيل مشروع التخرج الفني • البرمجة المتقدمة 2
                    </span>
                    <h3 className="text-lg font-black text-white leading-normal">لوحة قيادة إدارة المطورين وإحصاءات النظام الفخرية</h3>
                    
                    <p className="text-[11px] text-slate-350 leading-relaxed">
                      هذا النظام متكامل كلياً مع كوزموس الذاكرة التخزينية. يستقبل طلبات الإضافة والاستعلام وبحذفه يتولد تدمير ذري آمن للموارد المؤقتة. تم تصميمه بواسطة نخب ممتازة من هندسة الحواسب والمعلوماتية بجامعة حلب.
                    </p>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold block">رئيس هندسة النظام</span>
                        <span className="text-[11px] font-bold text-sky-450">عبدالكريم شعار</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold block">قاعدة البيانات وبوابة الأمان</span>
                        <span className="text-[11px] font-bold text-indigo-400">عبدالمجيد بري</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold block">تصميم تجربة العرض الديناميكي</span>
                        <span className="text-[11px] font-bold text-emerald-400">عدي سيد عيسى</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>جميع الصلاحيات مصرح بها وإجراءات الأمان نشطة • 2026</span>
            <button
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4.5 py-2 rounded-xl transition-colors cursor-pointer"
            >
              إغلاق اللوحة
            </button>
          </div>

          {/* نـافذة تأكيد الحذف المعزولة داخل الآي بريم لمنع مشاكل حظر النوافذ المنبثقة */}
          <AnimatePresence>
            {productToDelete && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 p-6 shadow-2xl space-y-4 text-right"
                >
                  <div className="flex items-center gap-2.5 text-rose-600 justify-start">
                    <div className="p-1.5 bg-rose-50 rounded-lg">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <h3 className="font-black text-xs text-rose-700">تأكيد عملية الحذف</h3>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                    هل أنت متأكد من رغبتك بالقضاء على هذا المنتج بشكل نهائي وإزالته من الكتلولوج؟
                    <span className="text-slate-900 font-extrabold mt-1.5 block bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 font-mono text-center">
                      {productToDelete.name}
                    </span>
                  </p>
                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setProductToDelete(null)}
                      className="px-3.5 py-1.5 text-[10px] font-black text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200/50"
                    >
                      تراجع وإلغاء
                    </button>
                    <button
                      type="button"
                      onClick={confirmDeleteProduct}
                      className="px-4.5 py-1.5 text-[10px] font-black text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm hover:shadow active:scale-98 transition-all cursor-pointer"
                    >
                      تأكيد الحذف النهائي
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
    </motion.div>
  );
}
