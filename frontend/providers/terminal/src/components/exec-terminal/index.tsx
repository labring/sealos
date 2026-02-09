import { Button, HStack, Spinner, Text, VStack } from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import { useCallback, useMemo, useState } from 'react';
import type { ExecTerminalRuntimePhase } from './ExecTerminalRuntime';
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

const ExecTerminalRuntime = dynamic(() => import('./ExecTerminalRuntime'), {
  ssr: false
});

export default function ExecTerminal(props: ExecTerminalProps) {
  const [phase, setPhase] = useState<ExecTerminalRuntimePhase>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [retrySeq, setRetrySeq] = useState(0);
  const commandKey = useMemo(() => (props.command || []).join('\u0000'), [props.command]);

  const title = useMemo(() => {
    const target =
      `${props.namespace}/${props.pod}` + (props.container ? `:${props.container}` : '');
    return `exec → ${target}`;
  }, [props.container, props.namespace, props.pod]);

  const handlePhaseChange = useCallback((p: ExecTerminalRuntimePhase) => {
    setPhase(p);
  }, []);

  const handleError = useCallback(
    (msg: string) => {
      try {
        console.error('[terminal.exec] error', {
          namespace: props.namespace,
          pod: props.pod,
          container: props.container,
          command: commandKey ? commandKey.split('\u0000') : undefined,
          agentBaseUrl: props.agentBaseUrl,
          wsPath: props.wsPath,
          ticketPath: props.ticketPath,
          retrySeq,
          message: msg
        });
      } catch {
        // ignore
      }
      setErrorMessage(msg);
      setPhase('error');
    },
    [
      props.namespace,
      props.pod,
      props.container,
      props.agentBaseUrl,
      props.wsPath,
      props.ticketPath,
      commandKey,
      retrySeq
    ]
  );

  return (
    <div className={styles.root}>
      <div className={styles.topLeft}>{title}</div>
      <ExecTerminalRuntime
        kubeconfig={props.kubeconfig}
        namespace={props.namespace}
        pod={props.pod}
        container={props.container}
        agentBaseUrl={props.agentBaseUrl}
        command={props.command}
        ticketInQuery={props.ticketInQuery}
        wsPath={props.wsPath}
        ticketPath={props.ticketPath}
        retrySeq={retrySeq}
        onPhaseChange={handlePhaseChange}
        onError={handleError}
      />
      {(phase === 'idle' || phase === 'connecting') && (
        <div className={styles.overlay}>
          <Spinner thickness="4px" speed="0.65s" emptyColor="gray.600" color="gray.200" size="xl" />
        </div>
      )}
      {phase === 'error' && (
        <div className={styles.errorOverlay}>
          <VStack spacing={3} align="center">
            <Text fontSize="sm" color="whiteAlpha.900">
              Exec connection failed
            </Text>
            {!!errorMessage && (
              <Text fontSize="xs" color="whiteAlpha.700" maxW="80vw" whiteSpace="pre-wrap">
                {errorMessage}
              </Text>
            )}
            <HStack spacing={2}>
              <Button
                size="sm"
                colorScheme="gray"
                variant="solid"
                onClick={() => {
                  setPhase('idle');
                  setErrorMessage('');
                  setRetrySeq((s) => s + 1);
                }}
              >
                Retry
              </Button>
            </HStack>
          </VStack>
        </div>
      )}
    </div>
  );
}
