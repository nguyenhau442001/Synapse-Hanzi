/**
 * ES module (bundled by Vite) — moved from the former assets/js/plum-blossom-background.js.
 *
 * 汉字思维 (Hànzì Sīwéi) · Synapse Hanzi
 * Modern Chinese Learning × Contemporary Oriental Aesthetics
 * 
 * Subtle Chinese Ink Ambient Effect (水墨微尘 · 墨韵烟岚):
 * - A handful of extremely faint floating ink & tea-dust particles (微墨细粒)
 * - Gentle, ultra-slow ink-wash diffusion (淡淡墨晕)
 * - A rare ink drop blooming in wide side margins only, never behind content (墨滴晕开)
 * - Low opacity, non-distracting, completely secondary to learning content
 * - Full accessibility: prefers-reduced-motion, page visibility pause
 * - Zero interaction blocking: pointer-events: none
 */


const CONFIG = {
  desktopParticles: 4,
  mobileParticles: 2,
  mobileBreakpoint: 768,
  mistLayers: 2,
  inkBloomIntervalMs: [6000, 11000],
  maxInkBlooms: 0,
  inkBloomMinGutter: 160,
};

const THEMES = {
  light: {
    particles: [
      { fill: '#5C5549', glow: 'rgba(92, 85, 73, 0.15)' }, // Pine-soot ink (松烟墨)
      { fill: '#8C7A65', glow: 'rgba(140, 122, 101, 0.15)' }, // Tea-dust brown (茶褐)
      { fill: '#A85A48', glow: 'rgba(168, 90, 72, 0.15)' }, // Muted terracotta (赭石)
      { fill: '#B5945B', glow: 'rgba(181, 148, 91, 0.2)' }, // Antique gold dust (泥金微粒)
    ],
    mist: [
      { color: 'rgba(235, 227, 212, 0.12)', yRatio: 0.75, speed: 0.08, height: 180 },
      { color: 'rgba(242, 235, 222, 0.16)', yRatio: 0.88, speed: 0.12, height: 210 },
    ],
    inkBloom: '60, 52, 44',
    inkBloomPeak: 0.035,
  },
  dark: {
    particles: [
      { fill: '#B89B68', glow: 'rgba(184, 155, 104, 0.25)' }, // Luminous antique gold
      { fill: '#8A8376', glow: 'rgba(138, 131, 118, 0.18)' }, // Warm moonlight ink
      { fill: '#C86A56', glow: 'rgba(200, 106, 86, 0.2)' }, // Muted cinnabar dust
    ],
    mist: [
      { color: 'rgba(28, 33, 42, 0.15)', yRatio: 0.75, speed: 0.08, height: 180 },
      { color: 'rgba(22, 26, 33, 0.20)', yRatio: 0.88, speed: 0.12, height: 210 },
    ],
    inkBloom: '184, 155, 104',
    inkBloomPeak: 0.03,
  },
};

class ChineseInkAmbientEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.width = 0;
    this.height = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.particles = [];
    this.mistBands = [];
    this.inkBlooms = [];
    this.nextInkBloomAt = 0;
    this.gutter = 0;
    this.lastGutterCheck = 0;

    this.animationFrameId = null;
    this.lastTime = 0;
    this.isRunning = false;
    this.reducedMotion = false;
    this.currentTheme = 'light';

    this.init();
  }

  init() {
    if (!this.canvas || !this.ctx) return;

    this.checkReducedMotion();
    this.updateTheme();
    this.resize();

    this.bindEvents();
    this.initMist();
    this.initParticles();
    this.measureGutter();

    if (this.reducedMotion) {
      this.renderStaticFrame();
    } else {
      this.start();
    }
  }

  checkReducedMotion() {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = mediaQuery.matches;
    mediaQuery.addEventListener('change', (e) => {
      this.reducedMotion = e.matches;
      if (this.reducedMotion) {
        this.stop();
        this.renderStaticFrame();
      } else {
        this.start();
      }
    });
  }

  updateTheme() {
    const themeAttr = document.documentElement.dataset.theme;
    this.currentTheme = themeAttr === 'dark' ? 'dark' : 'light';
  }

  bindEvents() {
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.resize();
        this.initParticles();
            this.measureGutter();
        if (this.reducedMotion) this.renderStaticFrame();
      }, 150);
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stop();
      } else if (!this.reducedMotion) {
        this.lastTime = performance.now();
        this.start();
      }
    });

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          this.updateTheme();
          this.updatePaletteStyles();
                if (this.reducedMotion) this.renderStaticFrame();
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);

    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  // Width of the empty side margin beside the main content column; ink blooms
  // only appear when the margin is wide enough to never overlap content.
  measureGutter() {
    const main = document.getElementById('workstationMiddle') || document.querySelector('.workstation');
    if (!main) { this.gutter = 0; return; }
    const rect = main.getBoundingClientRect();
    this.gutter = rect.width > 0 ? Math.max(0, Math.min(rect.left, this.width - rect.right)) : 0;
  }

  spawnInkBloom(now) {
    const g = this.gutter;
    const [lo, hi] = CONFIG.inkBloomIntervalMs;
    // Only in wide empty side margins, never behind the learning content
    if (g < CONFIG.inkBloomMinGutter) {
      this.nextInkBloomAt = now + lo + Math.random() * (hi - lo);
      return;
    }
    const side = Math.random() < 0.5;
    const x = side ? g * (0.25 + Math.random() * 0.5) : this.width - g * (0.25 + Math.random() * 0.5);
    const maxR = 40 + Math.random() * Math.min(60, g * 0.35);
    this.inkBlooms.push({
      x,
      y: this.height * (0.15 + Math.random() * 0.6),
      maxR,
      born: now,
      life: 5500 + Math.random() * 2500,
      // irregular blot: a few offset lobes
      lobes: Array.from({ length: 4 }, () => ({
        dx: (Math.random() - 0.5) * 0.7,
        dy: (Math.random() - 0.5) * 0.7,
        r: 0.45 + Math.random() * 0.45,
      })),
    });
    this.nextInkBloomAt = now + lo + Math.random() * (hi - lo);
  }

  updatePaletteStyles() {
    const palette = THEMES[this.currentTheme];
    this.mistBands.forEach((mist, idx) => {
      if (palette.mist[idx]) {
        mist.color = palette.mist[idx].color;
      }
    });
  }

  initMist() {
    const palette = THEMES[this.currentTheme];
    this.mistBands = palette.mist.map((conf) => ({
      x: Math.random() * this.width,
      y: this.height * conf.yRatio,
      speed: conf.speed,
      height: conf.height,
      color: conf.color,
      wavePhase: Math.random() * Math.PI * 2,
    }));
  }

  initParticles() {
    const isMobile = this.width < CONFIG.mobileBreakpoint;
    const count = isMobile ? CONFIG.mobileParticles : CONFIG.desktopParticles;

    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  createParticle(initial = false) {
    const palette = THEMES[this.currentTheme];
    const colorConf = palette.particles[Math.floor(Math.random() * palette.particles.length)];

    return {
      x: Math.random() * this.width,
      y: initial ? Math.random() * this.height : this.height + 15,
      radius: 1.1 + Math.random() * 1.3,
      color: colorConf.fill,
      glow: colorConf.glow,
      vy: -7 - Math.random() * 10, // Gentle upward float (7-17 px/s)
      vx: (Math.random() - 0.5) * 5,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.9 + Math.random() * 1.2,
      baseOpacity: 0.06 + Math.random() * 0.08, // Extremely low opacity (0.06 - 0.14)
    };
  }

  update(dt) {
    const sec = Math.min(dt / 1000, 0.1);

    // Subtle horizontal mist drift
    this.mistBands.forEach((mist) => {
      mist.x += mist.speed * (sec * 60);
      mist.wavePhase += 0.15 * sec;
      if (mist.x > this.width) {
        mist.x = -this.width * 0.5;
      }
    });

    // Subtle ink dust drift
    this.particles.forEach((p, idx) => {
      p.pulsePhase += p.pulseSpeed * sec;
      p.y += p.vy * sec;
      p.x += (p.vx + Math.sin(p.pulsePhase) * 3) * sec;

      if (p.y < -20 || p.x < -30 || p.x > this.width + 30) {
        this.particles[idx] = this.createParticle(false);
      }
    });

    // Ink blooms appear occasionally and fade away
    const now = performance.now();
    if (now - this.lastGutterCheck > 2000) {
      this.lastGutterCheck = now;
      this.measureGutter();
    }
    this.inkBlooms = this.inkBlooms.filter(b => now - b.born < b.life);
    if (!this.nextInkBloomAt) this.nextInkBloomAt = now + 2500;
    if (now >= this.nextInkBloomAt && this.inkBlooms.length < CONFIG.maxInkBlooms) {
      this.spawnInkBloom(now);
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.renderMist();
    this.renderInkBlooms();
    this.renderParticles();
  }

  renderInkBlooms() {
    const ctx = this.ctx;
    const palette = THEMES[this.currentTheme];
    const now = performance.now();
    this.inkBlooms.forEach((b) => {
      const t = Math.min(1, (now - b.born) / b.life);
      const grow = 1 - Math.pow(1 - t, 3); // ease-out spread, like ink soaking into paper
      const alpha = palette.inkBloomPeak * Math.sin(Math.PI * t);
      if (alpha <= 0.001) return;
      b.lobes.forEach((lobe) => {
        const r = b.maxR * lobe.r * (0.25 + 0.75 * grow);
        const cx = b.x + lobe.dx * b.maxR * grow;
        const cy = b.y + lobe.dy * b.maxR * grow;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `rgba(${palette.inkBloom}, ${alpha})`);
        grad.addColorStop(0.6, `rgba(${palette.inkBloom}, ${alpha * 0.55})`);
        grad.addColorStop(1, `rgba(${palette.inkBloom}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  renderMist() {
    const ctx = this.ctx;
    this.mistBands.forEach((mist) => {
      ctx.save();
      const mistY = mist.y + Math.sin(mist.wavePhase) * 8;

      const grad = ctx.createLinearGradient(0, mistY - mist.height * 0.5, 0, mistY + mist.height * 0.5);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.5, mist.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = grad;

      ctx.beginPath();
      const xOffset = mist.x;
      ctx.ellipse(xOffset, mistY, this.width * 0.85, mist.height * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(xOffset - this.width * 1.2, mistY, this.width * 0.85, mist.height * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  renderParticles() {
    const ctx = this.ctx;

    this.particles.forEach((p) => {
      const pulse = 0.5 + 0.5 * Math.sin(p.pulsePhase);
      const alpha = p.baseOpacity * (0.65 + 0.35 * pulse);

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = 3;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  renderStaticFrame() {
    this.measureGutter();
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.renderMist();
    this.renderParticles();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    const loop = (currentTime) => {
      if (!this.isRunning) return;
      const dt = currentTime - this.lastTime;
      this.lastTime = currentTime;

      this.update(dt);
      this.render();

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

// Start the engine on the background canvas (created inside .chinese-aesthetic-bg if missing).
export function mountAmbientBackground() {
  let canvas = document.getElementById('plumBlossomCanvas');
  if (!canvas) {
    const bgContainer = document.querySelector('.chinese-aesthetic-bg');
    if (bgContainer) {
      canvas = document.createElement('canvas');
      canvas.id = 'plumBlossomCanvas';
      canvas.className = 'plum-blossom-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      bgContainer.appendChild(canvas);
    }
  }
  if (canvas) window.__chineseAmbientEngine = new ChineseInkAmbientEngine(canvas);
}
