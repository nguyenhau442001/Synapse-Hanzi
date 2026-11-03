import { useEffect, useRef } from 'preact/hooks';

/**
 * PlumBlossomBackground Component
 * Renders subtle Chinese Ink & Plum Blossom Petal drifting ambient effect (墨韵微澜 · 梅花微风).
 * Pauses on tab switch or prefers-reduced-motion.
 */
export function PlumBlossomBackground({ theme = 'light' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let animationId = null;
    let width = 0;
    let height = 0;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const isDark = theme === 'dark';
    const petalColors = isDark
      ? ['rgba(230, 160, 175, 0.4)', 'rgba(215, 130, 150, 0.35)', 'rgba(240, 190, 200, 0.25)']
      : ['rgba(215, 95, 115, 0.35)', 'rgba(235, 135, 150, 0.4)', 'rgba(195, 75, 95, 0.25)'];

    const count = window.innerWidth <= 640 ? 12 : 22;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 4 + Math.random() * 5,
      speedX: 0.3 + Math.random() * 0.7,
      speedY: 0.6 + Math.random() * 1.1,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.03,
      color: petalColors[Math.floor(Math.random() * petalColors.length)]
    }));

    const drawPetal = (p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 1.4, p.size * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    let lastTime = performance.now();
    const render = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += (p.speedX + Math.sin(p.angle) * 0.3) * (dt * 60);
        p.y += p.speedY * (dt * 60);
        p.angle += p.spin;

        if (p.y > height + 20) {
          p.y = -20;
          p.x = Math.random() * width;
        }
        if (p.x > width + 20) {
          p.x = -20;
        }
        drawPetal(p);
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.85
      }}
    />
  );
}
