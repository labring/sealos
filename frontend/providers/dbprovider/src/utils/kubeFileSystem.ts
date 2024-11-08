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

  async execCommand(
    namespace: string,
    podName: string,
    containerName: string,
    command: string[],
    stdin: Readable | null = null,
    stdout: Writable | null = null
  ): Promise<string> {
    const stderr = new PassThrough();
    let chunks = Buffer.alloc(0);

    if (!stdout) {
      stdout = new PassThrough();
      stdout.on('data', (chunk) => {
        chunks = Buffer.concat([chunks, chunk]);
      });
    }

    const free = () => {
      stderr.removeAllListeners();
      stdout?.removeAllListeners();
      stdin?.removeAllListeners();
    };

    try {
      const ws = await this.k8sExec.exec(
        namespace,
        podName,
        containerName,
        command,
        stdout,
        stderr,
        stdin,
        false
      );

      return await new Promise<string>((resolve, reject) => {
        // Add WebSocket error handling
        ws?.on('error', (error: any) => {
          free();
          const errorMessage = error?.message || error?.toString() || 'Unknown error';
          reject(new Error(`WebSocket error: ${errorMessage}`));
        });

        stderr?.on('data', (error) => {
          free();
          reject(new Error(`Command execution error: ${error.toString()}`));
        });

        stdout?.on('end', () => {
          free();
          resolve(chunks.toString());
        });

        stdout?.on('error', (error) => {
          free();
          reject(new Error(`Output stream error: ${error.message}`));
        });

        if (stdin) {
          stdin.on('end', () => {
            free();
          });
        }
      }).catch((error) => {
        // Ensure all Promise-related errors are caught
        free();
        throw error;
      });
    } catch (error: any) {
      free();
      if (error?.type === 'error' && error?.target instanceof WebSocket) {
        throw new Error(`WebSocket error: ${error.message || 'Unknown error'}`);
      }
      throw new Error(`Command execution failed: ${error.message || 'Unknown error'}`);
    }
  }

  async getPodTimezone(namespace: string, podName: string, containerName: string): Promise<string> {
    try {
      const dateOutput = await this.execCommand(namespace, podName, containerName, ['date', '+%z']);
      const offset = dateOutput.trim();
      if (offset) {
        return this.getTimezoneFromOffset(offset);
      }
    } catch (error) {
      console.log('Failed to get timezone offset using date command:', error);
    }

    try {
      const timezoneFile = await this.execCommand(namespace, podName, containerName, [
        'cat',
        '/etc/timezone'
      ]);
      if (timezoneFile.trim()) {
        return timezoneFile.trim();
      }
    } catch (error) {}

    try {
      const localtimeLink = await this.execCommand(namespace, podName, containerName, [
        'readlink',
        '-f',
        '/etc/localtime'
      ]);
      const match = localtimeLink.match(/zoneinfo\/(.+)$/);
      if (match) {
        return match[1];
      }
    } catch (error) {}

    return 'Etc/UTC';
  }

  async ls({
    namespace,
    podName,
    containerName,
    path,
    showHidden = false
  }: {
    namespace: string;
    podName: string;
    containerName: string;
    path: string;
    showHidden: boolean;
  }) {
    let output: string;
    let isCompatibleMode = false;
    try {
      output = await this.execCommand(namespace, podName, containerName, [
        'ls',
        showHidden ? '-laQ' : '-lQ',
        '--color=never',
        '--full-time',
        path
      ]);
    } catch (error) {
      if (typeof error === 'string' && error.includes('ls: unrecognized option: full-time')) {
        isCompatibleMode = true;
        output = await this.execCommand(namespace, podName, containerName, [
          'ls',
          showHidden ? '-laQ' : '-lQ',
          '--color=never',
          '-e',
          path
        ]);
      } else {
        throw error;
      }
    }
    const lines: string[] = output.split('\n').filter((v) => v.length > 3);

    const directories: TFile[] = [];
    const files: TFile[] = [];
    const symlinks: TFile[] = [];

    const podTimezone = await this.getPodTimezone(namespace, podName, containerName);

    lines.forEach((line) => {
      const parts = line.split('"');
      const name = parts[1];

      if (!name || name === '.' || name === '..') return;

      const attrs = parts[0].split(' ').filter((v) => !!v);

      const file: TFile = {
        name: name,
        path: (name.startsWith('/') ? '' : path + '/') + name,
        dir: path,
        kind: line[0],
        attr: attrs[0],
        hardLinks: parseInt(attrs[1]),
        owner: attrs[2],
        group: attrs[3],
        size: parseInt(attrs[4]),
        updateTime: this.convertToUTC(attrs.slice(5, 7).join(' '), podTimezone)
      };

      if (isCompatibleMode) {
        file.updateTime = this.convertToUTC(attrs.slice(5, 10).join(' '), podTimezone);
      }

      if (file.kind === 'c') {
        if (isCompatibleMode) {
          file.updateTime = this.convertToUTC(attrs.slice(7, 11).join(' '), podTimezone);
        } else {
          file.updateTime = this.convertToUTC(attrs.slice(6, 8).join(' '), podTimezone);
        }
        file.size = parseInt(attrs[5]);
      }
      if (file.kind === 'l') {
        file.linkTo = parts[3];
        symlinks.push(file);
      }
      if (file.kind === 'd') {
        directories.push(file);
      } else {
        if (file.kind !== 't' && file.kind !== '') {
          files.push(file);
        }
      }
    });

    if (symlinks.length > 0) {
      const command = ['ls', '-ldQ', '--color=never'];

      try {
        symlinks.forEach((symlink) => {
          let linkTo = symlink.linkTo!;
          if (linkTo[0] !== '/') {
            linkTo = (symlink.dir === '/' ? '' : symlink.dir) + '/' + linkTo;
          }
          symlink.linkTo = linkTo;
          command.push(linkTo);
        });
      } catch (error) {
      } finally {
        const output = await this.execCommand(namespace, podName, containerName, command);
        const lines = output.split('\n').filter((v) => !!v);

        try {
          for (const line of lines) {
            if (line && line.includes('command terminated with non-zero exit code')) {
              const parts = line.split('"');
              try {
                symlinks.map((symlink) => {
                  if (symlink.linkTo === parts[1] && !symlink.processed) {
                    symlink.processed = true;
                    symlink.kind = line[0];
                    if (symlink.kind === 'd') {
                      directories.push(symlink);
                    }
                  }
                });
              } catch (error) {}
            }
          }
        } catch (error) {}
      }
    }

    directories.sort((a, b) => (a.name > b.name ? 1 : -1));

    return {
      directories: directories,
      files: files
    };
  }

  async mv({
    namespace,
    podName,
    containerName,
    from,
    to
  }: {
    namespace: string;
    podName: string;
    containerName: string;
    from: string;
    to: string;
  }) {
    return await this.execCommand(namespace, podName, containerName, ['mv', from, to]);
  }

  async rm({
    namespace,
    podName,
    containerName,
    path
  }: {
    namespace: string;
    podName: string;
    containerName: string;
    path: string;
  }) {
    return await this.execCommand(namespace, podName, containerName, ['rm', '-rf', path]);
  }

  async download({
    namespace,
    podName,
    containerName,
    path,
    stdout
  }: {
    namespace: string;
    podName: string;
    containerName: string;
    path: string;
    stdout: Writable;
  }) {
    return await this.execCommand(
      namespace,
      podName,
      containerName,
      ['dd', `if=${path}`, 'status=none'],
      null,
      stdout
    );
  }

  async mkdir({
    namespace,
    podName,
    containerName,
    path
  }: {
    namespace: string;
    podName: string;
    containerName: string;
    path: string;
  }) {
    return await this.execCommand(namespace, podName, containerName, ['mkdir', path]);
  }

  async touch({
    namespace,
    podName,
    containerName,
    path
  }: {
    namespace: string;
    podName: string;
    containerName: string;
    path: string;
  }) {
    return await this.execCommand(namespace, podName, containerName, ['touch', path]);
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
      ['sh', '-c', `dd of=${path} status=none bs=32767`],
      file
    );
    return result;
  }

  async md5sum({
    namespace,
    podName,
    containerName,
    path
  }: {
    namespace: string;
    podName: string;
    containerName: string;
    path: string;
  }) {
    return await this.execCommand(namespace, podName, containerName, ['md5sum', path]);
  }

  getTimezoneFromOffset(offset: string): string {
    const hours = parseInt(offset.slice(1, 3));
    const sign = offset.startsWith('-') ? '+' : '-';
    return `Etc/GMT${sign}${hours}`;
  }

  convertToUTC(dateString: string, timezone: string): Date {
    dateString = dateString.trim();
    timezone = timezone.trim();

    if (timezone === 'Etc/UTC') {
      timezone = 'UTC';
    }

    const dt = dayjs.tz(dateString, timezone).utc();

    if (!dt.isValid()) {
      console.error(`Failed to parse date: "${dateString}" with timezone "${timezone}"`);
      return new Date();
    }

    return dt.toDate();
  }
}
