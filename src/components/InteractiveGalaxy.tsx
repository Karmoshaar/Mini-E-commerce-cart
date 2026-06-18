/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  radius: number;
  color: string;
  angle: number;
  distance: number;
  speed: number;
  opacity: number;
  pulseSpeed: number;
  pulsePhase: number;
}

/**
 * InteractiveGalaxy Component - Apple-esque UX Engineering Design
 * 
 * فلفسفة التصميم البصري (Apple Human Interface Guidelines):
 * - استخدام نمط حركة عضوي ناعم (Organic Easing) بوجود خوارزمية تخميد فيزيائية (Dampening) لتبدو حركة المجرة مع الماوس انسيابية للغاية وليست فورية فاوية.
 * - الاستعانة بألوان الطيف السماوي البارد (Sky Blue, Pure Cyan, Deep Lilac) بشفافية تبلغ درجة الخفاء لتندمج مع خلفية المتجر الأنيق دون تشتيت انتباه المستخدم.
 * - معالجة تباين الشاشة وتجديد الحساب بصورة ديناميكية لتفادي حدوث أي تفاوت في الأداء.
 */
export default function InteractiveGalaxy() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const particleCount = 100; // كمية متوازنة ممتازة بستايل آبل (60FPS)

    // إعداد أبعاد الـ Canvas ديناميكياً بدقة الشاشات الكبيرة (Retina Display support)
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      
      // تهيئة مركز الماوس المبدئي في وسط الشاشة تماماً
      if (mouseRef.current.targetX === 0) {
        mouseRef.current.x = rect.width / 2;
        mouseRef.current.y = rect.height / 2;
        mouseRef.current.targetX = rect.width / 2;
        mouseRef.current.targetY = rect.height / 2;
      }

      initParticles(rect.width, rect.height);
    };

    // مصفوفة من الألوان السماوية المتألقة الواضحة (Premium Cyan Palette)
    const colors = [
      'rgba(14, 165, 233, ',   // Sky 500
      'rgba(56, 189, 248, ',   // Sky 300
      'rgba(6, 182, 212, ',    // Cyan 500
      'rgba(103, 232, 249, ',  // Cyan 200
      'rgba(99, 102, 241, ',   // Indigo 500
    ];

    // تهيئة الجزيئات المتألقة بتوزيع هندسي دوّار (Spiral Galaxy Distribution)
    const initParticles = (width: number, height: number) => {
      particles = [];
      const centerX = width / 2;
      const centerY = height / 2;

      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        // توزيع لوغاريتمي لجزيئات المجرة لتبدو مكتظة عند النواة
        const distance = Math.pow(Math.random(), 1.5) * (Math.min(width, height) * 0.45) + 15;
        const radius = Math.random() * 2.4 + 0.8;
        const colorPrefix = colors[Math.floor(Math.random() * colors.length)];
        const speed = (Math.random() * 0.0015 + 0.0005) * (1 - distance / (Math.min(width, height) * 0.5));
        const opacity = Math.random() * 0.55 + 0.25;

        particles.push({
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
          originX: centerX,
          originY: centerY,
          radius,
          color: colorPrefix,
          angle,
          distance,
          speed,
          opacity,
          pulseSpeed: Math.random() * 0.025 + 0.008,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }
    };

    // تتبع حركة الماوس وتحديث الإحداثيات المستهدفة
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
    };

    // حلقة الحركة والرسم (Render & Physics loop)
    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // تطبيق تأثير تلوين متلاشي ناعم لخلق ضبابية كونية خلفية (Nebulous Glow Effect)
      ctx.clearRect(0, 0, width, height);

      // تطبيق الـ Lerping الحسابي لخلق التخميد الدائري اللطيف (Lerp/easing ratio: 0.03)
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.035;
      mouse.y += (mouse.targetY - mouse.y) * 0.035;

      // محاكاة ضوء عائم عند موقع مؤشر الماوس الفردي (Floating Ambient Light)
      const gradient = ctx.createRadialGradient(
        mouse.x, mouse.y, 4,
        mouse.x, mouse.y, Math.min(width, height) * 0.4
      );
      gradient.addColorStop(0, 'rgba(56, 189, 248, 0.15)'); // متوهج سماوي رقيق جداً
      gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.05)'); // دمج مع لمسة بنفسجية هادئة
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // رسم وتحديث جزيئات المجرة الأثيرية
      particles.forEach((p) => {
        // تحديث زاوية الدوران الذاتية
        p.angle += p.speed;

        // دمج حركة دوران الجسيمات مع مركز الماوس (نواة المجرة المتحركة)
        const targetX = mouse.x + Math.cos(p.angle) * p.distance;
        const targetY = mouse.y + Math.sin(p.angle) * p.distance;

        // تطبيق خوارزمية تخميد طفيف لحركة الجسيم نحو مداره الجديد لتماسك فيزيائي مدهش
        p.x += (targetX - p.x) * 0.05;
        p.y += (targetY - p.y) * 0.05;

        // محاكاة اللمعان والنبض الطبيعي للنجوم (Star Twinkling Simulation)
        p.pulsePhase += p.pulseSpeed;
        const currentOpacity = p.opacity * (0.65 + Math.sin(p.pulsePhase) * 0.35);

        // الرسم الفعلي للجزيء الفاخر
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${currentOpacity})`;
        // إضافة توهج خلفي للنجوم اللامعة الكبيرة
        if (p.radius > 1.8) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#38bdf8';
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.fill();
      });

      // إعادة التصفير لنقاء الجداول التالية
      ctx.shadowBlur = 0;

      // رسم روابط كونية رفيعة للغاية بين النجوم المتقاربة (Celestial Web Constellations)
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.09)';
      ctx.lineWidth = 0.65;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 55) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    // استخدام الـ ResizeObserver للمزامنة الفائقة مع حجم المتصفح بالتأجيل لـ Frame التالي لمنع الخطأ
    let resizeFrameId: number;
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrameId);
      resizeFrameId = requestAnimationFrame(() => {
        resizeCanvas();
      });
    });
    
    resizeObserver.observe(canvas);
    window.addEventListener('mousemove', handleMouseMove);

    // تدشين الدورة الأولى
    resizeCanvas();
    render();

    // دورة الإفراغ والتنظيف الكاملة لحماية الذاكرة العشوائية (Garbage Collector Friendly)
    return () => {
      cancelAnimationFrame(animationFrameId);
      cancelAnimationFrame(resizeFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none opacity-100 transition-opacity duration-1000"
      id="aesthetic-galaxy-backdrop"
    />
  );
}
