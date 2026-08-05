import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import Terminal from '@/components/terminal';

vi.mock('next/router', () => ({
  useRouter: () => ({ query: {} })
}));

vi.mock('@/store/session', () => ({
  default: (selector: (state: { session: { user: { nsid: string } } }) => unknown) =>
    selector({ session: { user: { nsid: 'ns-test' } } })
}));

vi.mock('@/components/iconfont', () => ({
  default: () => null
}));

vi.mock('@chakra-ui/react', () => ({
  Box: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <div className={className}>{children}</div>
  ),
  Flex: ({
    children,
    className,
    onClick
  }: React.PropsWithChildren<{ className?: string; onClick?: () => void }>) => (
    <div className={className} onClick={onClick}>
      {children}
    </div>
  ),
  Text: ({ children }: React.PropsWithChildren) => <span>{children}</span>
}));

vi.mock('@/components/terminal/index.module.scss', () => ({
  default: {
    containerLeft: 'containerLeft',
    tabs: 'tabs',
    closeIcon: 'closeIcon',
    iframeWindow: 'iframeWindow'
  }
}));

const terminalOrigin = window.location.origin;
const terminalUrl = `${terminalOrigin}/terminal-frame?authorization=test`;

const dispatchMessage = (source: MessageEventSource, origin: string, data: unknown) => {
  window.dispatchEvent(new MessageEvent('message', { source, origin, data }));
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  flushSync(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

const renderTerminal = () => {
  flushSync(() => root.render(<Terminal url={terminalUrl} site={terminalOrigin} />));
};

describe('Terminal message routing', () => {
  test('initializes the first iframe when it reports ready', () => {
    renderTerminal();
    const iframe = container.querySelector('iframe');

    expect(iframe?.contentWindow).toBeTruthy();
    const postMessage = vi
      .spyOn(iframe!.contentWindow!, 'postMessage')
      .mockImplementation(() => {});

    dispatchMessage(iframe!.contentWindow!, terminalOrigin, { ttyd: 'ready' });

    expect(postMessage).toHaveBeenCalledTimes(3);
    expect(postMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ command: expect.stringContaining('namespace=ns-test') }),
      terminalOrigin
    );
  });

  test('sends initialization commands only to the iframe that reports ready', () => {
    renderTerminal();

    flushSync(() => {
      dispatchMessage(window, terminalOrigin, {
        type: 'new terminal',
        command: encodeURIComponent('pwd')
      });
    });

    const iframes = container.querySelectorAll<HTMLIFrameElement>('iframe');
    expect(iframes).toHaveLength(2);
    const firstIframe = iframes[0];
    const secondIframe = iframes[1];
    const firstPostMessage = vi
      .spyOn(firstIframe.contentWindow!, 'postMessage')
      .mockImplementation(() => {});
    const secondPostMessage = vi
      .spyOn(secondIframe.contentWindow!, 'postMessage')
      .mockImplementation(() => {});

    dispatchMessage(firstIframe.contentWindow!, terminalOrigin, { ttyd: 'ready' });

    expect(firstPostMessage).toHaveBeenCalledTimes(3);
    expect(secondPostMessage).not.toHaveBeenCalled();
  });
});
