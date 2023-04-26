export const isBrowser = () => typeof window !== 'undefined';

export const isIFrame = (input: HTMLElement | null): input is HTMLIFrameElement =>
  input !== null && input.tagName === 'IFRAME';

// export { request } from "./request"
