/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShoppingCart, Star, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import { useStore } from '../context/AppContext';
import { productService } from '../services/api';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const { refreshProducts, showToast } = useStore();
  const [isRatingActive, setIsRatingActive] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const handleRate = async (starValue: number) => {
    setIsSubmittingRating(true);
    try {
      const resp = await productService.rateProduct(product.id, starValue);
      if (resp.success) {
        showToast(`✓ شكراً لتقييمك! تم تسجيل ${starValue} نجوم بنجاح.`);
        await refreshProducts();
        setIsRatingActive(false);
      } else {
        showToast(`فشل تسجيل التقييم: ${resp.message}`);
      }
    } catch (err: any) {
      console.error("Error rating product:", err);
      showToast("تعذر تسجيل تقييمك للمنتج حالياً.");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // حساب نسبة الحسم إن وجد سعر أصلي (Calculating Discount Percent)
  const discountPercent = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <motion.div
      layout
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className="group premium-card-hover relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white/95 backdrop-blur-xs p-5 shadow-[0_3px_15px_-4px_rgba(15,23,42,0.015)]"
      dir="rtl"
      id={`product-card-${product.id}`}
    >
      {/* شريط الإضاءة العلوي الأنيق عند التحويم */}
      <div className="absolute top-0 right-0 h-[2.5px] w-0 bg-gradient-to-l from-sky-500 to-emerald-500 group-hover:w-full transition-all duration-550 ease-out" />

      {/* تصنيف المنتج والخصم */}
      <div className="absolute top-8 right-8 z-10 flex flex-col gap-1.5">
        <span className="rounded-lg bg-white/90 border border-slate-200/80 px-2.5 py-1 text-[9px] font-black text-slate-800 backdrop-blur-md shadow-xs">
          {product.category}
        </span>
        {discountPercent > 0 && (
          <span className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[9px] font-black text-white shadow-md shadow-emerald-500/10">
            وفر {discountPercent}%
          </span>
        )}
      </div>

      {/* صورة المنتج مع زووم خفيف عند التحويم وطبقة لمعان فائقة النعومة */}
      <div className="product-img-container relative aspect-square w-full overflow-hidden bg-slate-50/70 rounded-xl border border-slate-100">
        <img
          src={product.image}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-103"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* تفاصيل المنتج */}
      <div className="flex flex-grow flex-col pt-4">
        {/* التقييم والعنوان */}
        <div className="flex items-center justify-between gap-2 mb-2 min-h-[32px]">
          <AnimatePresence mode="wait">
            {!isRatingActive ? (
              <motion.button
                key="static-rating"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                onClick={() => setIsRatingActive(true)}
                className="flex items-center gap-1 font-semibold text-amber-500 hover:bg-amber-50 px-2.5 py-1 rounded-lg transition-all cursor-pointer group/rating border border-transparent hover:border-amber-150"
                title="اضغط لتقييم هذا المنتج الآن"
              >
                <Star className="h-3.5 w-3.5 fill-amber-500 group-hover/rating:scale-110 transition-transform" />
                <span className="text-[10px] font-black font-mono text-slate-700">{product.rating}</span>
                <span className="text-[8px] text-amber-600 font-black mr-1 border border-amber-300/30 bg-amber-50/50 px-1 py-0.2 rounded-sm opacity-0 group-hover/rating:opacity-100 transition-opacity">قَيِّم الآن</span>
              </motion.button>
            ) : (
              <motion.div
                key="interactive-rating"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex items-center gap-1 bg-amber-50/70 border border-amber-200/40 px-2 py-0.5 rounded-xl"
              >
                {isSubmittingRating ? (
                  <div className="flex items-center gap-1 text-[9px] font-black text-amber-800">
                    <RefreshCw className="h-3 w-3 animate-spin text-amber-600" />
                    <span>جاري الحفظ...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-black text-amber-800 ml-1">تـقييمك:</span>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((starValue) => {
                        const isLighted = hoverRating ? starValue <= hoverRating : false;
                        return (
                          <button
                            key={starValue}
                            type="button"
                            onMouseEnter={() => setHoverRating(starValue)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => handleRate(starValue)}
                            className="p-0.5 text-amber-400 hover:text-amber-500 transition-colors cursor-pointer"
                          >
                            <Star 
                              className={`h-3 w-3 transition-transform hover:scale-120 ${
                                isLighted ? 'fill-amber-400 text-amber-400' : 'text-slate-350 bg-transparent'
                              }`} 
                            />
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsRatingActive(false);
                      }}
                      className="text-[8px] font-black text-slate-450 hover:text-slate-700 mr-2 transition-colors cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <span className="text-[9px] text-slate-400 font-bold font-mono tracking-wider font-mono">CODE: ZN-0{product.id}</span>
        </div>

        <h3 className="text-xs font-black text-slate-900 leading-snug line-clamp-1 group-hover:text-sky-500 transition-all duration-300">
          {product.name}
        </h3>

        <p className="mt-1.5 text-[10px] text-slate-500 line-clamp-2 leading-relaxed flex-grow h-8 font-bold">
          {product.description}
        </p>

        {/* الأسعار وزر الإضافة للسلة بلمسة حركية متقنة */}
        <div className="mt-4 flex items-center justify-between pt-3.5 border-t border-slate-100/80">
          <div className="flex flex-col">
            <span className="text-xs font-black text-slate-950 font-mono tracking-tight flex items-center gap-0.5">
              <span className="text-[9px] font-bold text-slate-400">$</span>
              <span>{product.price}</span>
            </span>
            {product.originalPrice && (
              <span className="text-[9px] text-slate-400 line-through font-mono">
                ${product.originalPrice}
              </span>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAddToCart(product)}
            className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 w-auto px-4 text-[10px] font-black text-white transition-all duration-300 cursor-pointer shadow-xs hover:shadow-md"
            id={`add-to-cart-btn-${product.id}`}
          >
            <ShoppingCart className="h-3.5 w-3.5 text-sky-400 animate-pulse" />
            <span>إضافة للسلة</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
