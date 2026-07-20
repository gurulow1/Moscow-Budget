import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Users, Building2, ArrowRight, ShieldCheck, Eye } from 'lucide-react';

interface SplashPortalProps {
  onEnter: () => void;
  onOpenAccessibility: () => void;
  accessibilityEnabled: boolean;
  reduceMotion: boolean;
}

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  speed: number;
  shape: 'circle' | 'square' | 'diamond';
}

const BUDGET_STATS = [
  { icon: TrendingUp, label: 'Доходы 2026', value: '5,94 трлн ₽', color: '#10B981' },
  { icon: Building2, label: 'Расходы 2026', value: '6,39 трлн ₽', color: '#3B82F6' },
  { icon: Users, label: 'Социальная сфера', value: '3,2 трлн ₽', color: '#F59E0B' },
  { icon: ShieldCheck, label: 'Дефицит 2026', value: '447,6 млрд ₽', color: '#8B5CF6' },
];

export default function SplashPortal({
  onEnter,
  onOpenAccessibility,
  accessibilityEnabled,
  reduceMotion,
}: SplashPortalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isEntering, setIsEntering] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const prefersReducedMotion = reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles forming a subtle city skyline silhouette
    const particles: Particle[] = [];
    const colors = ['#CC1111', '#E11D48', '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899'];
    
    // Generate particles in a pattern suggesting Moscow skyline
    const count = Math.min(200, Math.floor((width * height) / 8000));
    for (let i = 0; i < count; i++) {
      const isTop = Math.random() > 0.6;
      const x = Math.random() * width;
      const y = isTop 
        ? Math.random() * height * 0.35 
        : height * 0.65 + Math.random() * height * 0.35;
      
      particles.push({
        x,
        y,
        targetX: x,
        targetY: y,
        vx: 0,
        vy: 0,
        size: Math.random() * 2.5 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.4 + 0.15,
        speed: Math.random() * 0.3 + 0.1,
        shape: ['circle', 'square', 'diamond'][Math.floor(Math.random() * 3)] as 'circle' | 'square' | 'diamond',
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let time = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.005;

      // Draw subtle radial glow from center
      const centerX = width / 2;
      const centerY = height / 2;
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) * 0.6);
      gradient.addColorStop(0, 'rgba(204, 17, 17, 0.03)');
      gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.02)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      particles.forEach((p) => {
        // Gentle floating motion
        p.targetX = p.x + Math.sin(time + p.y * 0.01) * 20;
        p.targetY = p.y + Math.cos(time + p.x * 0.01) * 10;

        // Mouse repulsion
        const dx = mouseRef.current.x - p.targetX;
        const dy = mouseRef.current.y - p.targetY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0 && dist < 120) {
          const force = (120 - dist) / 120;
          p.targetX -= (dx / dist) * force * 30;
          p.targetY -= (dy / dist) * force * 30;
        }

        // Smooth lerp
        p.vx += (p.targetX - p.x) * 0.02;
        p.vy += (p.targetY - p.y) * 0.02;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.x += p.vx;
        p.y += p.vy;

        // Draw particle
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        
        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'square') {
          ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        } else {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - p.size);
          ctx.lineTo(p.x + p.size, p.y);
          ctx.lineTo(p.x, p.y + p.size);
          ctx.lineTo(p.x - p.size, p.y);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      });

      // Draw connecting lines for nearby particles
      ctx.strokeStyle = 'rgba(204, 17, 17, 0.06)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.globalAlpha = (1 - dist / 100) * 0.15;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;

      animId = requestAnimationFrame(render);
    };

    const contentTimer = window.setTimeout(() => setShowContent(true), prefersReducedMotion ? 0 : 300);
    if (!prefersReducedMotion) render();

    return () => {
      cancelAnimationFrame(animId);
      window.clearTimeout(contentTimer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [reduceMotion]);

  const handleLaunchEnter = () => {
    if (isEntering) return;
    setIsEntering(true);
    const shouldReduceMotion = reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => {
      onEnter();
    }, shouldReduceMotion ? 0 : 320);
  };

  return (
    <div className="fixed inset-0 bg-[#0F172A] z-[9999] overflow-hidden flex flex-col items-center justify-center select-none font-sans">
      <button
        type="button"
        onClick={onOpenAccessibility}
        aria-label="Открыть версию для слабовидящих"
        aria-pressed={accessibilityEnabled}
        className="fixed right-3 top-3 z-20 flex min-h-11 items-center gap-2 rounded-xl border-2 border-white bg-[#0F172A] px-3 py-2 text-sm font-black text-white hover:bg-white hover:text-[#0F172A] sm:right-5 sm:top-5"
      >
        <Eye size={20} aria-hidden="true" />
        <span className="hidden sm:inline">Версия для слабовидящих</span>
      </button>

      {/* Animated background canvas */}
      <canvas 
        ref={canvasRef} 
        aria-hidden="true"
        className="decorative-canvas absolute inset-0 w-full h-full"
      />

      {/* Content overlay */}
      <AnimatePresence>
        {showContent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 flex flex-col items-center justify-center px-4 max-w-4xl w-full"
          >
            {/* Main title */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.7 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black text-white text-center tracking-tight leading-tight mb-4"
            >
              МосГорБюджет
              <span className="block text-[#CC1111] mt-1">.Трек</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="text-base sm:text-lg text-[#94a3b8] text-center max-w-xl mb-10 leading-relaxed"
            >
              Интерактивные сервисы и геймификация. Узнайте, куда уходят налоги, 
              рассчитайте свои вычеты и станьте экспертом столичного бюджета.
            </motion.p>

            {/* Stats grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-10 w-full max-w-2xl"
            >
              {BUDGET_STATS.map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.0 + idx * 0.1, duration: 0.5 }}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-4 text-center hover:bg-white/10 transition-colors duration-300"
                >
                  <stat.icon size={20} className="mx-auto mb-2" style={{ color: stat.color }} />
                  <div className="text-white font-black text-sm sm:text-base">{stat.value}</div>
                  <div className="text-[#64748B] text-[10px] sm:text-xs font-semibold mt-0.5 uppercase tracking-wider">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>

            {/* Enter button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.4, duration: 0.5 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleLaunchEnter}
              className="group relative px-8 py-4 rounded-2xl bg-[#CC1111] hover:bg-[#A30E0E] text-white font-extrabold text-sm sm:text-base uppercase tracking-wider shadow-[0_0_40px_rgba(204,17,17,0.3)] hover:shadow-[0_0_60px_rgba(204,17,17,0.5)] transition-all duration-300 flex items-center gap-3 cursor-pointer"
            >
              <span>Исследовать бюджет</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              
              {/* Pulse ring */}
              <span className="absolute inset-0 rounded-2xl border-2 border-[#CC1111]/50 animate-ping opacity-30" />
            </motion.button>

            {/* Footer note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8, duration: 0.6 }}
              className="fixed bottom-5 left-4 right-4 text-[10px] sm:text-xs text-[#64748B] font-medium text-center max-w-3xl mx-auto"
            >
              Учебный конкурсный прототип на открытых данных • неофициальный городской сервис • базовые показатели — по Закону города Москвы № 39 от 01.11.2025
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit animation overlay */}
      <AnimatePresence>
        {isEntering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-[#0F172A] z-[10000] pointer-events-none flex items-center justify-center"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="w-16 h-16 rounded-full border-2 border-[#CC1111]/50 flex items-center justify-center"
            >
              <div className="w-6 h-6 rounded-full bg-[#CC1111] animate-ping" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
