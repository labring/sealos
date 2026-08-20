/**
 * Detect if the browser is Safari (including iOS Safari)
 */
export const isSafari = (): boolean => {
  if (typeof window === 'undefined') return false;

  const ua = window.navigator.userAgent;
  const vendor = window.navigator.vendor;

  // Check for Safari (but not Chrome, which also contains "Safari" in UA)
  const isSafariBrowser =
    /Safari/.test(ua) && /Apple Computer/.test(vendor) && !/Chrome/.test(ua) && !/CriOS/.test(ua); // Chrome on iOS

  return isSafariBrowser;
};

/**
 * Detect if the browser is on iOS (iPhone, iPad, iPod)
 */
export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;

  const ua = window.navigator.userAgent;

  return /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
};

/**
 * Check if browser likely has issues with clipboard API after async operations
 */
export const needsClipboardWorkaround = (): boolean => {
  return isSafari() || isIOS();
};
