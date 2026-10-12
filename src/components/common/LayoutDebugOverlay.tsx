import React, { useState, useEffect } from 'react';
import { NAV_BREAKPOINT_PX } from '../../constants/app';

interface RectData {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface FontStatus {
  loaded: boolean;
  renderedFamily: string;
}

interface LayoutDebugInfo {
  innerWidth: number;
  innerHeight: number;
  dpr: number;
  navComponent: 'rail' | 'bottom bar' | 'none';
  navRect: RectData | null;
  navOffScreen: boolean;
  askRect: RectData | null;
  askOffScreen: boolean;
  mqResult: boolean;
  mainWidth: number;
  isContentClear: boolean;
  headingFont: FontStatus;
  bodyFont: FontStatus;
  accentFont: FontStatus;
}

const checkOffScreen = (rect: DOMRect, winWidth: number, winHeight: number): boolean => {
  // A component is off-screen if any part of it is outside the visible window
  // 0.5px margin prevents floating-point rounding false-positives on docked edges at varying DPR/zoom
  return (
    rect.left < -0.5 ||
    rect.top < -0.5 ||
    rect.right > winWidth + 0.5 ||
    rect.bottom > winHeight + 0.5
  );
};

export const LayoutDebugOverlay: React.FC = () => {
  const [info, setInfo] = useState<LayoutDebugInfo>(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 0;
    const h = typeof window !== 'undefined' ? window.innerHeight : 0;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const mq = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(`(min-width: ${NAV_BREAKPOINT_PX}px)`).matches
      : false;

    return {
      innerWidth: w,
      innerHeight: h,
      dpr,
      navComponent: 'none',
      navRect: null,
      navOffScreen: false,
      askRect: null,
      askOffScreen: false,
      mqResult: mq,
      mainWidth: 0,
      isContentClear: true,
      headingFont: { loaded: false, renderedFamily: '' },
      bodyFont: { loaded: false, renderedFamily: '' },
      accentFont: { loaded: false, renderedFamily: '' },
    };
  });

  useEffect(() => {
    let animId: number;

    const measure = () => {
      if (typeof window === 'undefined') return;

      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      const mqResult = window.matchMedia
        ? window.matchMedia(`(min-width: ${NAV_BREAKPOINT_PX}px)`).matches
        : false;

      // 1. Detect navigation component
      const railEl = document.querySelector('[data-nav="rail"], #app-nav-rail');
      const bottomEl = document.querySelector('[data-nav="bottom-bar"], #app-nav-bottom');

      let navComponent: 'rail' | 'bottom bar' | 'none' = 'none';
      let navRect: RectData | null = null;
      let navOffScreen = false;

      if (railEl && document.body.contains(railEl)) {
        navComponent = 'rail';
        const r = railEl.getBoundingClientRect();
        navRect = {
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height,
        };
        navOffScreen = checkOffScreen(r, winW, winH);
      } else if (bottomEl && document.body.contains(bottomEl)) {
        navComponent = 'bottom bar';
        const r = bottomEl.getBoundingClientRect();
        navRect = {
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height,
        };
        navOffScreen = checkOffScreen(r, winW, winH);
      }

      // 2. Detect floating "Ask your inbox" button
      const askEl = document.querySelector(
        '#ask-inbox-floating-button, [data-floating-button="ask-inbox"], button[aria-label="Ask your inbox"]'
      );
      let askRect: RectData | null = null;
      let askOffScreen = false;

      if (askEl && document.body.contains(askEl)) {
        const r = askEl.getBoundingClientRect();
        askRect = {
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height,
        };
        askOffScreen = checkOffScreen(r, winW, winH);
      }

      // 3. Detect main content column
      const mainEl = document.querySelector('#app-main-column, [data-main="content"], #app-main-scroll, main');
      let mainWidth = 0;
      let isContentClear = true;

      if (mainEl && document.body.contains(mainEl)) {
        const mRect = mainEl.getBoundingClientRect();
        mainWidth = mRect.width;

        if (navComponent === 'rail' && navRect) {
          // Rail right edge = navRect.left + navRect.width
          // Subpixel tolerance 0.5px: verify main's left edge is at or beyond rail's right edge
          isContentClear = mRect.left >= (navRect.left + navRect.width - 0.5);
        } else {
          // Bottom bar or no rail: main is clear from left edge
          isContentClear = mRect.left >= -0.5;
        }
      }

      // 4. Font Loading via document.fonts.check and rendered family inspection
      const checkFontLoaded = (name: string): boolean => {
        if (typeof document !== 'undefined' && document.fonts && typeof document.fonts.check === 'function') {
          try {
            return (
              document.fonts.check(`16px "${name}"`) ||
              document.fonts.check(`bold 16px "${name}"`) ||
              document.fonts.check(`500 16px "${name}"`)
            );
          } catch {
            return false;
          }
        }
        return false;
      };

      const headingLoaded = checkFontLoaded('Bricolage Grotesque');
      const bodyLoaded = checkFontLoaded('DM Sans');
      const accentLoaded = checkFontLoaded('Edu QLD Hand');

      // Sample elements for computed font family
      const sampleHeadingEl = document.querySelector('h1, h2, .font-heading');
      const sampleBodyEl = document.querySelector('main p, p, body');
      const sampleAccentEl = document.querySelector('.font-accent');

      const headingRendered = sampleHeadingEl ? window.getComputedStyle(sampleHeadingEl).fontFamily : 'not found';
      const bodyRendered = sampleBodyEl ? window.getComputedStyle(sampleBodyEl).fontFamily : 'not found';
      const accentRendered = sampleAccentEl ? window.getComputedStyle(sampleAccentEl).fontFamily : 'not found';

      setInfo({
        innerWidth: winW,
        innerHeight: winH,
        dpr,
        navComponent,
        navRect,
        navOffScreen,
        askRect,
        askOffScreen,
        mqResult,
        mainWidth,
        isContentClear,
        headingFont: { loaded: headingLoaded, renderedFamily: headingRendered },
        bodyFont: { loaded: bodyLoaded, renderedFamily: bodyRendered },
        accentFont: { loaded: accentLoaded, renderedFamily: accentRendered },
      });
    };

    // Immediate measure
    measure();

    // Event listeners for window resize & scroll
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true, capture: true });

    // Font readiness listener
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(() => measure());
      document.fonts.addEventListener?.('loadingdone', measure);
    }

    // Animation frame loop to track live changes
    let active = true;
    const loop = () => {
      if (!active) return;
      measure();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    return () => {
      active = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, { capture: true });
      if (typeof document !== 'undefined' && document.fonts) {
        document.fonts.removeEventListener?.('loadingdone', measure);
      }
    };
  }, []);

  return (
    <div
      className="fixed top-2.5 left-2.5 z-[9999] pointer-events-none select-none bg-black/85 backdrop-blur-xs text-white font-mono text-[12px] p-2.5 rounded-lg border border-white/20 shadow-2xl leading-snug space-y-1 max-w-sm"
      role="status"
      aria-label="Layout debug overlay"
    >
      {/* 1. window.innerWidth x window.innerHeight and devicePixelRatio */}
      <div>
        window: {info.innerWidth} x {info.innerHeight} | dpr: {info.dpr}
      </div>

      {/* 2. Which navigation component is currently rendered: "rail", "bottom bar" or "none" */}
      <div>
        nav: "{info.navComponent}"
      </div>

      {/* 3. Bounding rectangle of rendered navigation, and OFF-SCREEN line if outside visible window */}
      <div>
        nav rect: {info.navRect
          ? `top: ${info.navRect.top.toFixed(1)}, left: ${info.navRect.left.toFixed(1)}, width: ${info.navRect.width.toFixed(1)}, height: ${info.navRect.height.toFixed(1)}`
          : 'none'}
      </div>
      {info.navOffScreen && (
        <div className="text-red-400 font-bold tracking-wider">
          OFF-SCREEN
        </div>
      )}

      {/* 4. Bounding rectangle of floating "Ask your inbox" button, with OFF-SCREEN check */}
      <div>
        ask button rect: {info.askRect
          ? `top: ${info.askRect.top.toFixed(1)}, left: ${info.askRect.left.toFixed(1)}, width: ${info.askRect.width.toFixed(1)}, height: ${info.askRect.height.toFixed(1)}`
          : 'none'}
      </div>
      {info.askOffScreen && (
        <div className="text-red-400 font-bold tracking-wider">
          OFF-SCREEN
        </div>
      )}

      {/* 5. The current value of the media-query result that decides between rail and bottom bar */}
      <div>
        media-query ((min-width: {NAV_BREAKPOINT_PX}px)): {String(info.mqResult)}
      </div>

      {/* 6. Main content column width & CONTENT CLEAR / CONTENT UNDER NAV */}
      <div>
        main col width: {info.mainWidth.toFixed(1)}px
      </div>
      <div className={info.isContentClear ? 'text-emerald-400 font-bold tracking-wide' : 'text-red-400 font-bold tracking-wide'}>
        {info.isContentClear ? 'CONTENT CLEAR' : 'CONTENT UNDER NAV'}
      </div>

      {/* 7. Font checks (3 lines showing document.fonts.check and rendered font family) */}
      <div className="pt-1.5 border-t border-white/20 text-[11px] space-y-0.5">
        <div>
          Heading ("Bricolage Grotesque"): {info.headingFont.loaded ? 'LOADED' : 'CHECKING...'} | h1/h2: {info.headingFont.renderedFamily}
        </div>
        <div>
          Body ("DM Sans"): {info.bodyFont.loaded ? 'LOADED' : 'CHECKING...'} | p: {info.bodyFont.renderedFamily}
        </div>
        <div>
          Accent ("Edu QLD Hand"): {info.accentFont.loaded ? 'LOADED' : 'CHECKING...'} | accent: {info.accentFont.renderedFamily}
        </div>
      </div>
    </div>
  );
};
