import { useState, useEffect } from 'react';
import { NAV_BREAKPOINT_PX } from '../constants/app';

/**
 * Single hook to listen to a media query string.
 * Defaults to `defaultValue` (default: false) if matchMedia is not yet available.
 */
export function useMediaQuery(query: string, defaultValue: boolean = false): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia(query).matches;
    }
    return defaultValue;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQueryList = window.matchMedia(query);
    const updateMatch = () => {
      setMatches(mediaQueryList.matches);
    };

    // Initialize state to current matches
    setMatches(mediaQueryList.matches);

    // Event listener for media query changes (including browser zoom)
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', updateMatch);
    } else {
      mediaQueryList.addListener(updateMatch);
    }

    // Window resize listener as fallback for browser zoom level changes
    window.addEventListener('resize', updateMatch);

    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', updateMatch);
      } else {
        mediaQueryList.removeListener(updateMatch);
      }
      window.removeEventListener('resize', updateMatch);
    };
  }, [query]);

  return matches;
}

/**
 * Navigation breakpoint hook powered by the single breakpoint constant (600px).
 * Width below 600px: returns { isDesktop: false } (show only bottom bar)
 * Width 600px and above: returns { isDesktop: true } (show only side rail)
 * If media query result is not available yet, defaults to false (bottom bar).
 */
export function useNavBreakpoint(): { isDesktop: boolean } {
  // Below 600px is mobile/tablet bottom bar; 600px and above is desktop side rail
  const isDesktop = useMediaQuery(`(min-width: ${NAV_BREAKPOINT_PX}px)`, false);
  return { isDesktop };
}
