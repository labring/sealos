import { connectTerminalStreams } from '@labring/sealos-tty-client';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal as XTerm } from '@xterm/xterm';
import { Spinner, useToast } from '@chakra-ui/react';
import { debounce } from 'lodash';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './index.module.scss';

type ExecTerminalProps = {
  kubeconfig: string;
  namespace: string;
  pod: string;
  container?: string;
  /**
   * Optional. If not provided, defaults to current origin.
   */
  agentBaseUrl?: string;
  /**
   * Optional. If provided, will be sent to the agent ticket request.
   */
  command?: string[];
  /**
   * Optional. Defaults to false.
   */
  ticketInQuery?: boolean;
  /**
   * Optional. Override agent paths.
   */
  wsPath?: string;
  ticketPath?: string;
};

export default function ExecTerminal(props: ExecTerminalProps) {
  const toast = useToast();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const remoteResizeRef = useRef<((cols: number, rows: number) => void) | undefined>(undefined);
  const lastFittedSizeRef = useRef<{ cols: number; rows: number } | null>(null);
  const lastSentSizeRef = useRef<{ cols: number; rows: number } | null>(null);
  const endedRef = useRef(false);
  const stdinEnabledRef = useRef(false);

  const [phase, setPhase] = useState<'idle' | 'connecting' | 'started' | 'error'>('idle');

  const agentBaseUrl = useMemo(() => {
    if (props.agentBaseUrl) return props.agentBaseUrl;
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
  }, [props.agentBaseUrl]);

  const title = useMemo(() => {
    const target =
      `${props.namespace}/${props.pod}` + (props.container ? `:${props.container}` : '');
    return `exec → ${target}`;
  }, [props.container, props.namespace, props.pod]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!agentBaseUrl) return;
    if (!props.kubeconfig) return;

    const abortController = new AbortController();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    endedRef.current = false;
    stdinEnabledRef.current = false;

    const term = new XTerm({
      convertEol: true,
      cursorBlink: true,
      fontFamily:
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      fontSize: 14,
      theme: {
        background: '#2b2b2b',
        foreground: '#ffffff'
      }
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);

    const setDisableStdin = (disabled: boolean) => {
      try {
        // xterm supports this option; prevents local input from being emitted.
        (term as any).options = { ...(term as any).options, disableStdin: disabled };
      } catch {}
      try {
        (term as any).setOption?.('disableStdin', disabled);
      } catch {}
    };

    const writeSystemLine = (kind: 'info' | 'error', message: string) => {
      try {
        const color = kind === 'error' ? '\u001b[31m' : '\u001b[90m';
        const tag = kind === 'error' ? 'ERROR' : 'INFO';
        term.write(`\r\n${color}[${tag}] ${message}\u001b[0m\r\n`);
      } catch {}
    };

    const markEnded = (kind: 'info' | 'error', message: string) => {
      if (endedRef.current) return;
      endedRef.current = true;
      stdinEnabledRef.current = false;
      remoteResizeRef.current = undefined;
      setDisableStdin(true);
      writeSystemLine(kind, message);
    };

    const safeProposeAndResize = () => {
      const host = containerRef.current;
      if (!host) return false;
      const rect = host.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      try {
        const dims = fitAddon.proposeDimensions();
        if (!dims?.cols || !dims?.rows) return false;
        if (dims.cols !== term.cols || dims.rows !== term.rows) {
          term.resize(dims.cols, dims.rows);
          // Force a repaint to avoid partial rendering after resize.
          try {
            term.refresh(0, Math.max(0, term.rows - 1));
          } catch {}
        }
        return true;
      } catch {
        return false;
      }
    };

    const fitAndMaybeRemoteResize = () => {
      if (abortController.signal.aborted) return;
      if (!safeProposeAndResize()) return;
      lastFittedSizeRef.current = { cols: term.cols, rows: term.rows };
      try {
        const next = { cols: term.cols, rows: term.rows };
        const prev = lastSentSizeRef.current;
        if (!prev || prev.cols !== next.cols || prev.rows !== next.rows) {
          // Keep local terminal resizing after session end, but stop sending any control events.
          if (!endedRef.current) {
            remoteResizeRef.current?.(next.cols, next.rows);
            lastSentSizeRef.current = next;
          }
        }
      } catch {}
    };

    // Keep trying to fit during initial layout/font settling.
    let fitRaf = 0;
    let fitStart = performance.now();
    const fitLoop = () => {
      if (abortController.signal.aborted) return;
      fitAndMaybeRemoteResize();
      // Retry for up to 2 seconds to avoid sticking at 80x24 due to early measurements.
      if (performance.now() - fitStart < 2000) {
        fitRaf = window.requestAnimationFrame(fitLoop);
      }
    };
    fitRaf = window.requestAnimationFrame(fitLoop);
    const fitTimeouts = [
      window.setTimeout(() => fitAndMaybeRemoteResize(), 0),
      window.setTimeout(() => fitAndMaybeRemoteResize(), 200),
      window.setTimeout(() => fitAndMaybeRemoteResize(), 800)
    ];

    // Fonts can affect cell measurement; refit once fonts are ready.
    if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
      void (document as any).fonts.ready.then(() => {
        fitStart = performance.now();
        fitAndMaybeRemoteResize();
      });
    }

    let cleanupWindowResize: (() => void) | undefined;
    let cleanupResizeObserver: (() => void) | undefined;
    let cleanupTermResize: (() => void) | undefined;
    let close: ((code?: number, reason?: string) => void) | undefined;
    let resize: ((cols: number, rows: number) => void) | undefined;
    let releaseStdinWriter: (() => void) | undefined;

    // Observe container size changes (more reliable than window.resize).
    const host = containerRef.current;
    if (host && typeof ResizeObserver !== 'undefined') {
      const roCallback = debounce(() => {
        fitAndMaybeRemoteResize();
      }, 60);
      const ro = new ResizeObserver(roCallback);
      ro.observe(host);
      cleanupResizeObserver = () => {
        roCallback.cancel();
        ro.disconnect();
      };
    }

    const start = async () => {
      setPhase('connecting');
      try {
        setDisableStdin(true);
        const streams = await connectTerminalStreams({
          client: {
            baseUrl: agentBaseUrl,
            wsPath: props.wsPath,
            ticketPath: props.ticketPath
          },
          ticketRequest: {
            kubeconfig: props.kubeconfig,
            namespace: props.namespace,
            pod: props.pod,
            container: props.container,
            command: props.command
          },
          connect: {
            initialSize: { cols: term.cols, rows: term.rows },
            ticketInQuery: props.ticketInQuery
          },
          signal: abortController.signal
        });

        close = streams.close;
        resize = streams.resize;
        remoteResizeRef.current = resize;
        // If we already fitted but couldn't send, send it now.
        if (lastFittedSizeRef.current) {
          const { cols, rows } = lastFittedSizeRef.current;
          try {
            resize(cols, rows);
            lastSentSizeRef.current = { cols, rows };
          } catch {}
        }
        // And refit now that remote resize is available.
        fitStart = performance.now();
        fitAndMaybeRemoteResize();

        const stdinWriter = streams.stdin.getWriter();
        releaseStdinWriter = () => {
          try {
            stdinWriter.releaseLock();
          } catch {}
        };

        const disposeOnData = term.onData((data) => {
          if (abortController.signal.aborted) return;
          if (endedRef.current) return;
          if (!stdinEnabledRef.current) return;
          void stdinWriter.write(encoder.encode(data)).catch((err) => {
            if (abortController.signal.aborted) return;
            markEnded('error', err?.message || 'stdin writer failed');
          });
        });
        stdinEnabledRef.current = true;
        setDisableStdin(false);

        // When xterm itself resizes (e.g. after fit), sync to remote as a control frame.
        const disposeOnResize = term.onResize(({ cols, rows }) => {
          if (abortController.signal.aborted) return;
          lastFittedSizeRef.current = { cols, rows };
          try {
            const prev = lastSentSizeRef.current;
            if (!prev || prev.cols !== cols || prev.rows !== rows) {
              if (!endedRef.current) {
                remoteResizeRef.current?.(cols, rows);
                lastSentSizeRef.current = { cols, rows };
              }
            }
          } catch {}
        });
        cleanupTermResize = () => disposeOnResize.dispose();

        const syncResize = debounce(() => {
          fitAndMaybeRemoteResize();
        }, 120);
        window.addEventListener('resize', syncResize);
        cleanupWindowResize = () => {
          window.removeEventListener('resize', syncResize);
          syncResize.cancel();
        };

        // stdout: binary -> utf8 text (stream mode handles multi-byte chars across frames)
        void (async () => {
          const reader = streams.stdout.getReader();
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              if (value) term.write(decoder.decode(value, { stream: true }));
            }
            if (!abortController.signal.aborted) {
              markEnded('info', 'Remote stream closed');
            }
          } catch (err) {
            // reader might abort on close; only surface unexpected errors
            if (!abortController.signal.aborted) {
              markEnded('error', (err as any)?.message || 'stdout reader failed');
            }
          } finally {
            try {
              reader.releaseLock();
            } catch {}
          }
        })();

        // frames: optional diagnostics
        void (async () => {
          const reader = streams.frames.getReader();
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              if (!value) continue;
              if (value.type === 'error') {
                if (!abortController.signal.aborted) {
                  markEnded('error', value.message || 'TTY agent error');
                  try {
                    close?.(1011, 'agent error');
                  } catch {}
                }
                toast({
                  position: 'top',
                  title: 'TTY agent error',
                  description: value.message,
                  status: 'error',
                  duration: 8000,
                  isClosable: true
                });
              }
            }
            if (!abortController.signal.aborted) {
              // frames end usually indicates the session is gone
              markEnded('info', 'Connection closed');
            }
          } catch (err) {
            if (!abortController.signal.aborted) {
              markEnded('error', (err as any)?.message || 'frames reader failed');
            }
          } finally {
            try {
              reader.releaseLock();
            } catch {}
          }
        })();

        // Important: some backends only start exec after first resize.
        fitAndMaybeRemoteResize();

        setPhase('started');

        return () => {
          disposeOnData.dispose();
        };
      } catch (err: any) {
        setPhase('error');
        if (!abortController.signal.aborted) {
          markEnded('error', err?.message || String(err));
        }
        toast({
          position: 'top',
          title: 'Exec terminal connect failed',
          description: err?.message || String(err),
          status: 'error',
          duration: 8000,
          isClosable: true
        });
      }
    };

    let disposeOnDataCleanup: (() => void) | undefined;
    void start().then((cleanup) => {
      disposeOnDataCleanup = cleanup;
    });

    return () => {
      abortController.abort();
      endedRef.current = true;
      stdinEnabledRef.current = false;
      if (fitRaf) window.cancelAnimationFrame(fitRaf);
      fitTimeouts.forEach((t) => window.clearTimeout(t));
      cleanupWindowResize?.();
      cleanupResizeObserver?.();
      cleanupTermResize?.();
      disposeOnDataCleanup?.();
      releaseStdinWriter?.();
      try {
        close?.(1000, 'closed');
      } catch {}
      term.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    agentBaseUrl,
    props.kubeconfig,
    props.namespace,
    props.pod,
    props.container,
    props.ticketInQuery,
    props.wsPath,
    props.ticketPath,
    // command array identity may change; normalize by joining
    (props.command || []).join('\u0000')
  ]);

  return (
    <div className={styles.root}>
      <div className={styles.topLeft}>{title}</div>
      <div ref={containerRef} className={styles.term} />
      {(phase === 'idle' || phase === 'connecting') && (
        <div className={styles.overlay}>
          <Spinner thickness="4px" speed="0.65s" emptyColor="gray.600" color="gray.200" size="xl" />
        </div>
      )}
    </div>
  );
}
