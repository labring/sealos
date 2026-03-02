import { connectTerminalStreams } from '@labring/sealos-tty-client';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { useToast } from '@chakra-ui/react';
import { debounce } from 'lodash';
import { useEffect, useMemo, useRef } from 'react';
import styles from './index.module.scss';

export type ExecTerminalRuntimePhase = 'idle' | 'connecting' | 'started' | 'ended' | 'error';

type ExecTerminalRuntimeProps = {
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
  retrySeq: number;
  onPhaseChange: (phase: ExecTerminalRuntimePhase) => void;
  onError: (message: string) => void;
};

export default function ExecTerminalRuntime(props: ExecTerminalRuntimeProps) {
  const toast = useToast();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const remoteResizeRef = useRef<((cols: number, rows: number) => void) | undefined>(undefined);
  const lastFittedSizeRef = useRef<{ cols: number; rows: number } | null>(null);
  const lastSentSizeRef = useRef<{ cols: number; rows: number } | null>(null);
  const endedRef = useRef(false);
  const stdinEnabledRef = useRef(false);

  const agentBaseUrl = useMemo(() => {
    if (props.agentBaseUrl) return props.agentBaseUrl;
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
  }, [props.agentBaseUrl]);

  const commandKey = useMemo(() => (props.command || []).join('\u0000'), [props.command]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!agentBaseUrl) return;
    if (!props.kubeconfig) return;

    const logError = (scope: string, err: unknown) => {
      try {
        console.error(
          '[terminal.exec]',
          {
            scope: scope,
            namespace: props.namespace,
            pod: props.pod,
            container: props.container,
            command: props.command,
            agentBaseUrl,
            wsPath: props.wsPath,
            ticketPath: props.ticketPath,
            retrySeq: props.retrySeq
          },
          err
        );
      } catch {
        // ignore
      }
    };

    const abortController = new AbortController();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    endedRef.current = false;
    stdinEnabledRef.current = false;

    let term: Terminal | undefined;
    let fitAddon: FitAddon | undefined;

    try {
      term = new Terminal({
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
      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);
    } catch (err: any) {
      const msg = err?.message || String(err);
      logError('xterm.init.failed', err);
      props.onPhaseChange('error');
      props.onError(msg);
      toast({
        position: 'top',
        title: 'Exec terminal init failed',
        description: msg,
        status: 'error',
        duration: 8000,
        isClosable: true
      });
      try {
        term?.dispose();
      } catch {}
      return;
    }

    if (!term || !fitAddon) return;
    const activeTerm = term;
    const activeFitAddon = fitAddon;

    const setDisableStdin = (disabled: boolean) => {
      try {
        // xterm supports this option; prevents local input from being emitted.
        (activeTerm as any).options = {
          ...(activeTerm as any).options,
          disableStdin: disabled
        };
      } catch {}
      try {
        (activeTerm as any).setOption?.('disableStdin', disabled);
      } catch {}
    };

    const writeSystemLine = (kind: 'info' | 'error', message: string) => {
      try {
        const color = kind === 'error' ? '\u001b[31m' : '\u001b[90m';
        const tag = kind === 'error' ? 'ERROR' : 'INFO';
        activeTerm.write(`\r\n${color}[${tag}] ${message}\u001b[0m\r\n`);
      } catch {}
    };

    const markEnded = (kind: 'info' | 'error', message: string) => {
      if (endedRef.current) return;
      endedRef.current = true;
      stdinEnabledRef.current = false;
      remoteResizeRef.current = undefined;
      setDisableStdin(true);
      if (kind === 'error') {
        logError('session.ended', message);
        props.onPhaseChange('error');
        props.onError(message);
      } else {
        props.onPhaseChange('ended');
      }
      writeSystemLine(kind, message);
    };

    const safeProposeAndResize = () => {
      const host = containerRef.current;
      if (!host) return false;
      const rect = host.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      try {
        const dims = activeFitAddon.proposeDimensions();
        if (!dims?.cols || !dims?.rows) return false;
        if (dims.cols !== activeTerm.cols || dims.rows !== activeTerm.rows) {
          activeTerm.resize(dims.cols, dims.rows);
          // Force a repaint to avoid partial rendering after resize.
          try {
            activeTerm.refresh(0, Math.max(0, activeTerm.rows - 1));
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
      lastFittedSizeRef.current = { cols: activeTerm.cols, rows: activeTerm.rows };
      try {
        const next = { cols: activeTerm.cols, rows: activeTerm.rows };
        const prev = lastSentSizeRef.current;
        if (!prev || prev.cols !== next.cols || prev.rows !== next.rows) {
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
      props.onPhaseChange('connecting');
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
            initialSize: { cols: activeTerm.cols, rows: activeTerm.rows },
            ticketInQuery: props.ticketInQuery
          },
          signal: abortController.signal
        });

        close = streams.close;
        resize = streams.resize;
        remoteResizeRef.current = resize;

        if (lastFittedSizeRef.current) {
          const { cols, rows } = lastFittedSizeRef.current;
          try {
            resize(cols, rows);
            lastSentSizeRef.current = { cols, rows };
          } catch {}
        }

        fitStart = performance.now();
        fitAndMaybeRemoteResize();

        const stdinWriter = streams.stdin.getWriter();
        releaseStdinWriter = () => {
          try {
            stdinWriter.releaseLock();
          } catch {}
        };

        const disposeOnData = activeTerm.onData((data) => {
          if (abortController.signal.aborted) return;
          if (endedRef.current) return;
          if (!stdinEnabledRef.current) return;
          void stdinWriter.write(encoder.encode(data)).catch((err) => {
            if (abortController.signal.aborted) return;
            if ((err as any)?.name === 'AbortError') return;
            logError('stdin.write.failed', err);
            markEnded('error', err?.message || 'stdin writer failed');
          });
        });
        stdinEnabledRef.current = true;
        setDisableStdin(false);

        const disposeOnResize = activeTerm.onResize(({ cols, rows }) => {
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

        void (async () => {
          const reader = streams.stdout.getReader();
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              if (value) activeTerm.write(decoder.decode(value, { stream: true }));
            }
            if (!abortController.signal.aborted) {
              markEnded('info', 'Remote stream closed');
            }
          } catch (err) {
            if (abortController.signal.aborted) return;
            if ((err as any)?.name === 'AbortError') return;
            logError('stdout.read.failed', err);
            markEnded('error', (err as any)?.message || 'stdout reader failed');
          } finally {
            try {
              reader.releaseLock();
            } catch {}
          }
        })();

        void (async () => {
          const reader = streams.frames.getReader();
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              if (!value) continue;
              if (value.type === 'error') {
                logError('agent.frame.error', value);
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
              markEnded('info', 'Connection closed');
            }
          } catch (err) {
            if (abortController.signal.aborted) return;
            if ((err as any)?.name === 'AbortError') return;
            logError('frames.read.failed', err);
            markEnded('error', (err as any)?.message || 'frames reader failed');
          } finally {
            try {
              reader.releaseLock();
            } catch {}
          }
        })();

        fitAndMaybeRemoteResize();
        props.onPhaseChange('started');

        return () => {
          disposeOnData.dispose();
        };
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (abortController.signal.aborted || err?.name === 'AbortError') {
          // Abort is expected during cleanup/fast switch; avoid error state loops.
          return;
        }
        logError('connect.failed', err);
        props.onPhaseChange('error');
        props.onError(msg);
        if (!abortController.signal.aborted) {
          markEnded('error', msg);
        }
        toast({
          position: 'top',
          title: 'Exec terminal connect failed',
          description: msg,
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
      try {
        activeTerm.dispose();
      } catch {}
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
    props.retrySeq,
    commandKey,
    props.onError,
    props.onPhaseChange
  ]);

  return <div ref={containerRef} className={styles.term} />;
}
