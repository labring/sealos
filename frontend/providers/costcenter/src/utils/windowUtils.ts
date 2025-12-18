export function openInNewWindow(
  url: string,
  target: string = '_blank',
  features: string = 'noopener,noreferrer'
): Window | null {
  if (window.parent && window.parent !== window) {
    return window.parent.open(url, target, features);
  } else if (window.top && window.top !== window) {
    return window.top.open(url, target, features);
  } else {
    return window.open(url, target, features);
  }
}
