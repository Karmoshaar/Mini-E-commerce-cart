/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { LayoutGrid, SlidersHorizontal, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import ProductCard from './ProductCard';
import { useProducts, useCart } from '../context/AppContext';

export default function ProductList() {
  const { products } = useProducts();
  const { addToCart: onAddToCart } = useCart();
  // تتبع الفئة المحددة للتصفية (Selected Category State)
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  
  // تتبع نص البحث الحالي (Search Query State)
  const [searchQuery, setSearchQuery] = useState<string>('');

  // استخراج كافة الفئات الفريدة بشكل ديناميكي (Extract Unique Categories Dynamically)
  const categories = useMemo(() => {
    const list = new Set(products.map(p => p.category));
    return ['الكل', ...Array.from(list)];
  }, [products]);

  // المنتجات المصفاة بناء على التصنيف والبحث معاً (Filtered Products)
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'الكل' || p.category === selectedCategory;
      const matchesSearch = searchQuery.trim() === '' || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="flex flex-col gap-8" dir="rtl" id="product-list-container">
      {/* قسم تحكم التصفية والعلوين */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200/60 pb-6">
        <div>
          <h2 className="flex items-center gap-2.5 text-sm font-black text-slate-900 font-display tracking-normal">
            <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-sky-500 via-indigo-500 to-emerald-500" />
            <span>منتجات المستقبل الذكية</span>
          </h2>
          <p className="text-[10px] text-slate-400 font-bold mt-1.5 max-w-xl leading-relaxed">
            استكشف فئة حصرية ومنتقاة بعناية من الإلكترونيات والملحقات فائقة الجودة المصممة لمشاريع الغد والراحة الاستثنائية.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
          {/* حقل البحث الأنيق */}
          <div className="relative flex-1 sm:w-72">
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-sky-500/80" />
            </div>
            <input
              type="text"
              placeholder="ابحث عن الشواحن، الإلكترونيات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-10 pl-9 text-[11px] font-black text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none transition-all shadow-[0_2px_10px_-4px_rgba(15,23,42,0.01)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 left-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title="مسح البحث"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* أزرار التصفية المتجاوبة (Category Filter Tabs) */}
          <div className="flex flex-wrap gap-1.5 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60 backdrop-blur-xs">
            {categories.map((category) => {
              const isActive = selectedCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`relative px-4 py-2 text-[10px] font-black rounded-lg transition-all duration-300 cursor-pointer ${
                    isActive ? 'text-white' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeCategoryTab"
                      className="absolute inset-0 bg-slate-900 rounded-lg shadow-sm"
                      transition={{ type: 'spring', stiffness: 355, damping: 24 }}
                    />
                  )}
                  <span className="relative z-10">{category}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* مصفوفة عرض بطاقات المنتجات المخصصة (Responsive Grid Layout) */}
      {filteredProducts.length > 0 ? (
        <motion.div 
          layout
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
              >
                <ProductCard
                  product={product}
                  onAddToCart={onAddToCart}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <SlidersHorizontal className="h-10 w-10 text-gray-400 mb-3" />
          <h3 className="text-sm font-bold text-gray-800">لا توجد منتجات متطابقة!</h3>
          <p className="text-xs text-gray-400 mt-1">جرب تغيير تصنيف البحث المختار.</p>
        </div>
      )}
    </div>
  );
}
