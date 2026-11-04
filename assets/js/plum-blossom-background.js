/**
 * 汉字思维 (Hànzì Sīwéi) · Synapse Hanzi
 * Modern Chinese Learning × Contemporary Oriental Aesthetics
 * 
 * Subtle Chinese Ink Ambient Effect (水墨微尘 · 墨韵烟岚 · 梅花飘落):
 * - Extremely subtle floating ink & tea-dust particles (微墨细粒)
 * - Gentle, ultra-slow ink-wash diffusion (淡淡墨晕)
 * - A few tumbling plum blossom petals drifting down (梅瓣飘落)
 * - Occasional ink drops blooming on the paper and fading (墨滴晕开)
 * - Vertical calligraphy couplet with a red seal in wide side margins (书法对联 · 印章)
 * - Low opacity, non-distracting, completely secondary to learning content
 * - Full accessibility: prefers-reduced-motion, page visibility pause
 * - Zero interaction blocking: pointer-events: none
 */

(function () {
  'use strict';

  const CONFIG = {
    desktopParticles: 12,
    mobileParticles: 6,
    mobileBreakpoint: 768,
    mistLayers: 2,
    desktopPetals: 10,
    mobilePetals: 4,
    inkBloomIntervalMs: [6000, 11000],
    maxInkBlooms: 2,
    calligraphyMinGutter: 120,
    calligraphyLeft: '学而时习之',
    calligraphyRight: '温故而知新',
    sealText: '汉字',
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
      petals: ['#C9545B', '#D98A8F', '#E3A9A4', '#B8434A'], // Plum red → blush pink (梅红)
      petalAlpha: [0.42, 0.7],
      petalCenter: '#C5A46D',
      inkBloom: '60, 52, 44',
      inkBloomPeak: 0.055,
      calligraphy: 'rgba(60, 52, 44, 0.11)',
      seal: 'rgba(168, 50, 42, 0.42)',
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
      petals: ['#C86A6E', '#D9989A', '#B5585E', '#E2B7B2'], // Moonlit muted plum (月下梅)
      petalAlpha: [0.3, 0.52],
      petalCenter: '#B89B68',
      inkBloom: '184, 155, 104',
      inkBloomPeak: 0.045,
      calligraphy: 'rgba(184, 155, 104, 0.10)',
      seal: 'rgba(200, 106, 86, 0.45)',
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
      this.petals = [];
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
      this.initPetals();
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
          this.initPetals();
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
            this.initPetals();
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

    // Width of the empty side margin beside the main content column; calligraphy
    // only appears when the margin is wide enough to never overlap content.
    measureGutter() {
      const main = document.getElementById('workstationMiddle') || document.querySelector('.workstation');
      if (!main) { this.gutter = 0; return; }
      const rect = main.getBoundingClientRect();
      this.gutter = rect.width > 0 ? Math.max(0, Math.min(rect.left, this.width - rect.right)) : 0;
    }

    initPetals() {
      const isMobile = this.width < CONFIG.mobileBreakpoint;
      const count = isMobile ? CONFIG.mobilePetals : CONFIG.desktopPetals;
      this.petals = [];
      for (let i = 0; i < count; i++) {
        this.petals.push(this.createPetal(true));
      }
    }

    createPetal(initial = false) {
      const palette = THEMES[this.currentTheme];
      const [aMin, aMax] = palette.petalAlpha;
      return {
        x: Math.random() * this.width,
        y: initial ? Math.random() * this.height : -20 - Math.random() * 60,
        size: 5.5 + Math.random() * 5,
        blossom: Math.random() < 0.28, // some whole five-petal flowers, mostly single petals
        color: palette.petals[Math.floor(Math.random() * palette.petals.length)],
        alpha: aMin + Math.random() * (aMax - aMin),
        vy: 14 + Math.random() * 16,
        drift: 6 + Math.random() * 10,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.5 + Math.random() * 0.6,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 1.2,
        flipPhase: Math.random() * Math.PI * 2,
        flipSpeed: 1 + Math.random() * 1.6,
      };
    }

    spawnInkBloom(now) {
      const g = this.gutter;
      let x;
      if (g >= 90) {
        const side = Math.random() < 0.5;
        x = side ? g * (0.2 + Math.random() * 0.6) : this.width - g * (0.2 + Math.random() * 0.6);
      } else {
        x = Math.random() * this.width;
      }
      const maxR = 50 + Math.random() * (g >= 90 ? Math.min(90, g * 0.6) : 70);
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
      const [lo, hi] = CONFIG.inkBloomIntervalMs;
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
        baseOpacity: 0.08 + Math.random() * 0.12, // Extremely low opacity (0.08 - 0.2)
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

      // Plum petals tumbling down with a gentle sway
      this.petals.forEach((p, idx) => {
        p.swayPhase += p.swaySpeed * sec;
        p.flipPhase += p.flipSpeed * sec;
        p.rotation += p.spin * sec;
        p.y += p.vy * sec;
        p.x += (Math.sin(p.swayPhase) * p.drift + 4) * sec;
        if (p.y > this.height + 20 || p.x > this.width + 30) {
          this.petals[idx] = this.createPetal(false);
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
      this.renderCalligraphy();
      this.renderInkBlooms();
      this.renderParticles();
      this.renderPetals();
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

    drawPetalShape(ctx, size) {
      // Rounded plum petal with a soft notch at the tip
      ctx.beginPath();
      ctx.moveTo(0, size * 0.55);
      ctx.bezierCurveTo(size * 0.75, size * 0.35, size * 0.7, -size * 0.6, size * 0.12, -size * 0.55);
      ctx.quadraticCurveTo(0, -size * 0.38, -size * 0.12, -size * 0.55);
      ctx.bezierCurveTo(-size * 0.7, -size * 0.6, -size * 0.75, size * 0.35, 0, size * 0.55);
      ctx.closePath();
      ctx.fill();
    }

    renderPetals() {
      const ctx = this.ctx;
      const palette = THEMES[this.currentTheme];
      this.petals.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(p.flipPhase))); // 3D tumble
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        if (p.blossom) {
          for (let i = 0; i < 5; i++) {
            ctx.save();
            ctx.rotate((i * 2 * Math.PI) / 5);
            ctx.translate(0, -p.size * 0.62);
            this.drawPetalShape(ctx, p.size * 0.75);
            ctx.restore();
          }
          ctx.fillStyle = palette.petalCenter;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.22, 0, Math.PI * 2);
          ctx.fill();
        } else {
          this.drawPetalShape(ctx, p.size);
        }
        ctx.restore();
      });
    }

    // Vertical calligraphy couplet in the side margins, with a small red seal.
    renderCalligraphy() {
      const g = this.gutter;
      if (g < CONFIG.calligraphyMinGutter || this.height < 560) return;
      const ctx = this.ctx;
      const palette = THEMES[this.currentTheme];
      const fontSize = Math.round(Math.min(46, Math.max(30, g * 0.22)));
      const lineGap = fontSize * 1.32;
      const top = Math.max(120, this.height * 0.2);
      const columns = [
        { text: CONFIG.calligraphyLeft, x: g * 0.5 },
        { text: CONFIG.calligraphyRight, x: this.width - g * 0.5 },
      ];
      ctx.save();
      ctx.font = `600 ${fontSize}px "Songti SC", "Noto Serif SC", "STSong", "SimSun", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = palette.calligraphy;
      columns.forEach((col) => {
        Array.from(col.text).forEach((ch, i) => {
          ctx.fillText(ch, col.x, top + i * lineGap);
        });
      });

      // Seal stamp (印章) under the right column
      const sealSize = Math.round(fontSize * 0.9);
      const sx = columns[1].x - sealSize / 2;
      const sy = top + Array.from(CONFIG.calligraphyRight).length * lineGap - lineGap * 0.2;
      ctx.fillStyle = palette.seal;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(sx, sy, sealSize, sealSize, sealSize * 0.12);
      else ctx.rect(sx, sy, sealSize, sealSize);
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.font = `700 ${Math.round(sealSize * 0.36)}px "Songti SC", "Noto Serif SC", "STSong", serif`;
      const [a, b] = Array.from(CONFIG.sealText);
      // Traditional seals read top-to-bottom, right column first
      ctx.fillText(a, sx + sealSize * 0.72, sy + sealSize * 0.3);
      ctx.fillText(b, sx + sealSize * 0.72, sy + sealSize * 0.7);
      ctx.fillText('印', sx + sealSize * 0.3, sy + sealSize * 0.5);
      ctx.restore();
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
      this.renderCalligraphy();
      this.renderParticles();
      this.renderPetals();
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

  function initChineseAmbientBackground() {
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
      window.__chineseAmbientEngine = new ChineseInkAmbientEngine(canvas);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChineseAmbientBackground);
  } else {
    initChineseAmbientBackground();
  }
})();
