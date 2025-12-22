import { PassThrough, Readable, Writable } from 'stream';
import * as k8s from '@kubernetes/client-node';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export type TFile = {
  name: string;
  path: string;
  dir: string;
  kind: string;
  attr: string;
  hardLinks: number;
  owner: string;
  group: string;
  size: number;
  updateTime: Date;
  linkTo?: string;
  processed?: boolean;
};

export class KubeFileSystem {
  private readonly k8sExec: k8s.Exec;

  constructor(k8sExec: k8s.Exec) {
    this.k8sExec = k8sExec;
  }

  execCommand(
    namespace: string,
    podName: string,
    containerName: string,
    command: string[],
    stdin: Readable | null = null,
    stdout: Writable | null = null
  ) {
    return new Promise<string>(async (resolve, reject) => {
      const stderr = new PassThrough();

      let chunks = Buffer.alloc(0);
      let stderrChunks = Buffer.alloc(0);
      let hasError = false;

      if (!stdout) {
        stdout = new PassThrough();
        stdout.on('data', (chunk) => {
          chunks = Buffer.concat([chunks, chunk]);
        });
      }

      stderr.on('data', (chunk) => {
        stderrChunks = Buffer.concat([stderrChunks, chunk]);
        const stderrText = chunk.toString();
        console.log('stderr output:', stderrText);

        if (
          stderrText.includes('Error:') ||
          stderrText.includes('error:') ||
          stderrText.includes('failed')
        ) {
          hasError = true;
        }
      });

      const free = () => {
        stderr.removeAllListeners();
        stdout?.removeAllListeners();
        stdin?.removeAllListeners();
      };

      stdout.on('end', () => {
        free();
        if (hasError) {
          reject(new Error(stderrChunks.toString() || 'Command execution failed'));
        } else {
          resolve(chunks.toString());
        }
      });
      stdout.on('error', (error) => {
        free();
        reject(error);
      });

      try {
        const WebSocket = await this.k8sExec.exec(
          namespace,
          podName,
          containerName,
          command,
          stdout,
          stderr,
          stdin,
          false
        );

        WebSocket.on('close', (code: number) => {
          free();
          // WebSocket close codes: 1000 = normal closure, 1001-1015 are standard codes
          // Only treat as error if code indicates abnormal closure and there was actual error
          const isNormalClose = code === 1000 || code === undefined || code === 0;

          if (!isNormalClose && (hasError || stderrChunks.length > 0)) {
            reject(new Error(`Command exited with code ${code}: ${stderrChunks.toString()}`));
          } else if (hasError) {
            reject(new Error(stderrChunks.toString() || 'Command execution failed'));
          } else {
            resolve(chunks.toString() || 'success');
          }
        });

        WebSocket.on('error', (error: Error) => {
          free();
          reject(error);
        });
      } catch (error) {
        free();
        reject(error);
      }

      if (stdin) {
        stdin.on('end', () => {
          free();
        });
      }
    });
  }

  async upload({
    namespace,
    podName,
    containerName,
    path,
    file
  }: {
    namespace: string;
    podName: string;
    containerName: string;
    path: string;
    file: PassThrough;
  }): Promise<string> {
    const result = await this.execCommand(
      namespace,
      podName,
      containerName,
      ['sh', '-c', `dd of=${path} status=none bs=32767; :`],
      file
    );
    return result;
  }
}
