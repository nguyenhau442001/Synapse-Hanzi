/**
 * 汉字思维 (Hànzì Sīwéi) - Chinese Classical Animated Background: 梅花飘落 · 水墨云雾 · 金色微光
 * 
 * Layered Composition:
 * - Layer 1 & 2: Base Xuan paper & distant ink-wash mountain silhouettes (SVG background)
 * - Layer 3: Subtle horizontal Chinese ink-wash mist (水墨烟岚)
 * - Layer 4: Falling Chinese plum blossom petals & occasional 5-petal flowers (红梅飘落)
 * - Layer 5: Sparse warm golden floating particles (金色微光)
 * 
 * Performance & Accessibility:
 * - Single lightweight <canvas> element using requestAnimationFrame
 * - 8–14 petals on desktop, 5–7 on mobile
 * - Pauses automatically when tab is inactive (Page Visibility API)
 * - Respects prefers-reduced-motion
 * - Completely non-interactive (pointer-events: none)
 */

(function () {
  'use strict';

  // Configuration Constants
  const CONFIG = {
    // Petal counts
    desktopPetals: 12,
    mobilePetals: 6,
    // Gold particles
    desktopGold: 10,
    mobileGold: 5,
    // Mist layers
    mistLayersCount: 3,
    // Breakpoints
    mobileBreakpoint: 768,
  };

  // Chinese Classical Palette for Plum Blossoms
  // Authentic rounded Chinese plum petals (梅花瓣), deep vermilion and muted crimson
  const PALETTES = {
    light: {
      petals: [
        { main: '#A8322A', shadow: '#8F2525', highlight: '#C23B32' }, // Vermilion / 朱砂
        { main: '#B83A31', shadow: '#942621', highlight: '#D9534F' }, // Muted crimson / 绛红
        { main: '#8F2525', shadow: '#6B1717', highlight: '#A8322A' }, // Deep imperial red / 宫墙红
        { main: '#C23B32', shadow: '#9E2A2B', highlight: '#F4C2BC' }, // Rose highlight / 丹红带粉
      ],
      gold: {
        fill: '#C5A46D', // Antique gold / 泥金
        glow: 'rgba(197, 164, 109, 0.35)',
      },
      mist: [
        { color: 'rgba(239, 231, 216, 0.16)', yRatio: 0.62, speed: 0.12, height: 160 },
        { color: 'rgba(245, 240, 230, 0.22)', yRatio: 0.74, speed: 0.18, height: 190 },
        { color: 'rgba(235, 226, 210, 0.14)', yRatio: 0.86, speed: 0.08, height: 220 },
      ],
    },
    dark: {
      petals: [
        { main: '#BA3930', shadow: '#7A1D1A', highlight: '#D44C42' }, // Moonlit vermilion
        { main: '#A8322A', shadow: '#691513', highlight: '#C53E35' }, // Nocturnal crimson
        { main: '#8F2525', shadow: '#591111', highlight: '#B8322A' }, // Deep ink red
        { main: '#C53E35', shadow: '#821B17', highlight: '#E5A59E' }, // Moonlit highlight
      ],
      gold: {
        fill: '#D4B37F', // Luminous gold / 浮金
        glow: 'rgba(212, 179, 127, 0.4)',
      },
      mist: [
        { color: 'rgba(32, 38, 48, 0.18)', yRatio: 0.62, speed: 0.12, height: 160 },
        { color: 'rgba(25, 30, 38, 0.24)', yRatio: 0.74, speed: 0.18, height: 190 },
        { color: 'rgba(35, 42, 54, 0.16)', yRatio: 0.86, speed: 0.08, height: 220 },
      ],
    },
  };

  class PlumBlossomEngine {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });
      this.width = 0;
      this.height = 0;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.petals = [];
      this.goldParticles = [];
      this.mistBands = [];

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
      // Debounced resize
      let resizeTimer = null;
      window.addEventListener('resize', () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          this.resize();
          this.initParticles();
          if (this.reducedMotion) this.renderStaticFrame();
        }, 150);
      }, { passive: true });

      // Page Visibility handling (pause when tab is inactive)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stop();
        } else if (!this.reducedMotion) {
          this.lastTime = performance.now();
          this.start();
        }
      });

      // Observer for theme attribute changes on <html>
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

      this.ctx.scale(this.dpr, this.dpr);
    }

    updatePaletteStyles() {
      // Re-assign active theme colors to mist and particles
      const palette = PALETTES[this.currentTheme];
      this.mistBands.forEach((mist, idx) => {
        if (palette.mist[idx]) {
          mist.color = palette.mist[idx].color;
        }
      });
    }

    initMist() {
      const palette = PALETTES[this.currentTheme];
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
      const petalCount = isMobile ? CONFIG.mobilePetals : CONFIG.desktopPetals;
      const goldCount = isMobile ? CONFIG.mobileGold : CONFIG.desktopGold;

      // Initialize Falling Plum Blossoms
      this.petals = [];
      for (let i = 0; i < petalCount; i++) {
        this.petals.push(this.createPetal(true));
      }

      // Initialize Golden Floating Particles
      this.goldParticles = [];
      for (let i = 0; i < goldCount; i++) {
        this.goldParticles.push(this.createGoldParticle(true));
      }
    }

    createPetal(initial = false) {
      const palette = PALETTES[this.currentTheme];
      const colorScheme = palette.petals[Math.floor(Math.random() * palette.petals.length)];
      
      // 1 in 7 petals is a full 5-petal plum flower (五瓣梅花)
      const isFullFlower = Math.random() < 0.14;

      const size = isFullFlower ? (11 + Math.random() * 5) : (7 + Math.random() * 6);
      const x = Math.random() * (this.width + 100) - 50;
      const y = initial ? Math.random() * (this.height + 60) - 40 : -30 - Math.random() * 40;

      return {
        x,
        y,
        size,
        isFullFlower,
        colorScheme,
        // Motion properties
        vy: 24 + Math.random() * 26,             // Gentle fall: 24 - 50 px/s
        vxWind: -8 - Math.random() * 12,          // Natural breeze drifting slightly right-to-left
        swayAmp: 16 + Math.random() * 22,         // Sine sway amplitude
        swayFreq: 0.8 + Math.random() * 1.0,      // Sine sway frequency
        swayPhase: Math.random() * Math.PI * 2,
        // 2D Rotation & 3D Tumbling
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 1.2,
        rollPhase: Math.random() * Math.PI * 2,
        rollSpeed: 1.2 + Math.random() * 1.5,
        opacity: 0.75 + Math.random() * 0.2,
      };
    }

    createGoldParticle(initial = false) {
      return {
        x: Math.random() * this.width,
        y: initial ? Math.random() * this.height : this.height + 10,
        radius: 1.0 + Math.random() * 1.2,
        vy: -8 - Math.random() * 12,              // Slow upward or hovering drift
        vx: (Math.random() - 0.5) * 6,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 1.2 + Math.random() * 1.5,
        baseOpacity: 0.18 + Math.random() * 0.22,
      };
    }

    update(dt) {
      const sec = Math.min(dt / 1000, 0.1); // Cap delta to avoid teleportation

      // 1. Update Mist Bands
      this.mistBands.forEach((mist) => {
        mist.x += mist.speed * (sec * 60);
        mist.wavePhase += 0.2 * sec;
        if (mist.x > this.width) {
          mist.x = -this.width * 0.5;
        }
      });

      // 2. Update Falling Plum Petals
      this.petals.forEach((p, idx) => {
        p.swayPhase += p.swayFreq * sec;
        p.rollPhase += p.rollSpeed * sec;
        p.rotation += p.rotSpeed * sec;

        // Position changes
        const swayX = Math.sin(p.swayPhase) * p.swayAmp;
        p.x += (p.vxWind + swayX * 0.3) * sec;
        p.y += p.vy * sec;

        // Reset when out of viewport
        if (p.y > this.height + 40 || p.x < -120 || p.x > this.width + 120) {
          this.petals[idx] = this.createPetal(false);
        }
      });

      // 3. Update Golden Floating Particles
      this.goldParticles.forEach((g, idx) => {
        g.pulsePhase += g.pulseSpeed * sec;
        g.y += g.vy * sec;
        g.x += (g.vx + Math.sin(g.pulsePhase) * 4) * sec;

        if (g.y < -20 || g.x < -20 || g.x > this.width + 20) {
          this.goldParticles[idx] = this.createGoldParticle(false);
        }
      });
    }

    render() {
      this.ctx.clearRect(0, 0, this.width, this.height);

      // Layer 3: Animated Chinese Ink-Wash Mist (水墨云雾)
      this.renderMist();

      // Layer 4: Falling Plum Blossoms (红梅飘落)
      this.renderPetals();

      // Layer 5: Sparse Golden Floating Particles (金色微光)
      this.renderGoldParticles();
    }

    renderMist() {
      const ctx = this.ctx;
      this.mistBands.forEach((mist) => {
        ctx.save();
        const mistY = mist.y + Math.sin(mist.wavePhase) * 12;

        // Soft linear gradient feathering top & bottom of mist band
        const grad = ctx.createLinearGradient(0, mistY - mist.height * 0.5, 0, mistY + mist.height * 0.5);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.5, mist.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = grad;

        // Draw soft elongated mist cloud band stretching across view
        ctx.beginPath();
        const xOffset = mist.x;
        ctx.ellipse(xOffset, mistY, this.width * 0.8, mist.height * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wrap around seamlessly
        ctx.beginPath();
        ctx.ellipse(xOffset - this.width * 1.2, mistY, this.width * 0.8, mist.height * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });
    }

    renderPetals() {
      const ctx = this.ctx;

      this.petals.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        // 3D Tumbling simulation (rolling scale)
        const rollScale = Math.cos(p.rollPhase);
        ctx.scale(1, Math.max(Math.abs(rollScale), 0.25));

        // Fade in near top, fade out near bottom
        let alpha = p.opacity;
        if (p.y < 80) {
          alpha *= Math.max(0, p.y / 80);
        } else if (p.y > this.height - 120) {
          alpha *= Math.max(0, (this.height - p.y) / 120);
        }
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

        if (p.isFullFlower) {
          this.drawFullPlumBlossom(ctx, p.size, p.colorScheme);
        } else {
          this.drawPlumPetal(ctx, p.size, p.colorScheme);
        }

        ctx.restore();
      });
    }

    /**
     * Draw authentic Chinese Plum Blossom Petal (梅花瓣)
     * Distinct from Japanese Sakura: smooth rounded ovate contour without notched tip
     */
    drawPlumPetal(ctx, size, color) {
      const w = size * 0.72;
      const h = size * 1.15;

      ctx.beginPath();
      // Organic cup-shaped / obovate rounded petal
      ctx.moveTo(0, h * 0.45);
      // Left curve
      ctx.bezierCurveTo(-w * 1.05, h * 0.15, -w * 0.95, -h * 0.4, 0, -h * 0.55);
      // Right curve
      ctx.bezierCurveTo(w * 0.95, -h * 0.4, w * 1.05, h * 0.15, 0, h * 0.45);
      ctx.closePath();

      // Shaded petal gradient
      const grad = ctx.createRadialGradient(0, -h * 0.1, 0, 0, 0, h * 0.65);
      grad.addColorStop(0, color.highlight);
      grad.addColorStop(0.55, color.main);
      grad.addColorStop(1, color.shadow);

      ctx.fillStyle = grad;
      ctx.fill();

      // Delicate subtle central petal rib
      ctx.beginPath();
      ctx.moveTo(0, h * 0.4);
      ctx.quadraticCurveTo(0, 0, 0, -h * 0.35);
      ctx.strokeStyle = color.shadow;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    /**
     * Draw Miniature 5-Petal Chinese Plum Blossom (五瓣红梅)
     */
    drawFullPlumBlossom(ctx, size, color) {
      const petalRadius = size * 0.48;

      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5;
        ctx.save();
        ctx.rotate(angle);
        ctx.translate(0, -size * 0.42);

        ctx.beginPath();
        ctx.moveTo(0, petalRadius * 0.85);
        ctx.bezierCurveTo(-petalRadius * 0.9, petalRadius * 0.4, -petalRadius * 0.8, -petalRadius * 0.7, 0, -petalRadius);
        ctx.bezierCurveTo(petalRadius * 0.8, -petalRadius * 0.7, petalRadius * 0.9, petalRadius * 0.4, 0, petalRadius * 0.85);
        ctx.closePath();

        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, petalRadius);
        grad.addColorStop(0, color.highlight);
        grad.addColorStop(0.6, color.main);
        grad.addColorStop(1, color.shadow);

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }

      // Antique Gold Stamen Center
      const goldColor = PALETTES[this.currentTheme].gold.fill;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = goldColor;
      ctx.fill();

      // Stamen dots (花蕊)
      ctx.fillStyle = color.shadow;
      const dotCount = 5;
      for (let j = 0; j < dotCount; j++) {
        const a = (j * Math.PI * 2) / dotCount;
        const dx = Math.cos(a) * (size * 0.12);
        const dy = Math.sin(a) * (size * 0.12);
        ctx.beginPath();
        ctx.arc(dx, dy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    renderGoldParticles() {
      const ctx = this.ctx;
      const gold = PALETTES[this.currentTheme].gold;

      this.goldParticles.forEach((g) => {
        const pulse = 0.5 + 0.5 * Math.sin(g.pulsePhase);
        const alpha = g.baseOpacity * (0.6 + 0.4 * pulse);

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.fillStyle = gold.fill;
        ctx.shadowColor = gold.glow;
        ctx.shadowBlur = 4;

        ctx.beginPath();
        ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });
    }

    renderStaticFrame() {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.renderMist();
      // Draw a few resting / poised petals for peaceful static composition
      this.renderPetals();
      this.renderGoldParticles();
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

  // Initialize once DOM is ready
  function initPlumBlossomBackground() {
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

    if (canvas) {
      window.__plumBlossomEngine = new PlumBlossomEngine(canvas);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlumBlossomBackground);
  } else {
    initPlumBlossomBackground();
  }
})();
