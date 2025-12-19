export function openInNewWindow(
  url: string,
  target: string = '_blank',
  features: string = 'noopener,noreferrer'
) {
  window.open(url, target, features);
}
