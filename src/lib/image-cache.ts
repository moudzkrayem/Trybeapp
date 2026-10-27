'use client';

/**
 * A lightweight client-side image cache to prevent redundant network requests
 * and provide instant rendering for previously viewed images.
 * Uses debounced localStorage and non-blocking idle scheduling.
 */

interface CacheEntry {
  timestamp: number;
}

class ImageCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxItems = 100;
  private storageKey = 'trybe_image_cache_meta';
  private saveTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.cache = new Map(Object.entries(parsed));
        }
      } catch (e) {
        // Safe ignore
      }
    }
  }

  private save() {
    if (typeof window === 'undefined') return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(Object.fromEntries(this.cache)));
      } catch (e) {
        // Storage quota / private mode safe
      }
    }, 500);
  }

  /**
   * Returns the URL directly without creating unnecessary async overhead.
   */
  async get(url: string): Promise<string> {
    return url;
  }

  /**
   * Preloads a batch of images non-blockingly during idle time.
   */
  preloadBatch(urls: string[]) {
    if (typeof window === 'undefined') return;

    // Limit batch to top 8 visible items to keep network bandwidth free for UI/API
    const validUrls = urls
      .filter((url) => url && typeof url === 'string' && !this.cache.has(url))
      .slice(0, 8);

    if (validUrls.length === 0) return;

    const runPreload = () => {
      validUrls.forEach((url) => {
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.onload = () => {
          if (this.cache.size >= this.maxItems) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) this.cache.delete(oldestKey);
          }
          this.cache.set(url, { timestamp: Date.now() });
          this.save();
        };
        img.onerror = () => {
          // Non-fatal, do not cache broken images
        };
        img.src = url;
      });
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(runPreload, { timeout: 1500 });
    } else {
      setTimeout(runPreload, 300);
    }
  }

  /**
   * Invalidates a specific URL from the cache.
   */
  invalidate(url: string) {
    if (url) {
      this.cache.delete(url);
      this.save();
    }
  }

  clear() {
    this.cache.clear();
    this.save();
  }
}

export const imageCache = new ImageCache();
