import { describe, expect, it, vi } from 'vitest';
import { KubeFileSystem } from '@/utils/kubeFileSystem';

describe('KubeFileSystem.ls', () => {
  it('keeps listing a directory when one symbolic link is dangling', async () => {
    const fileSystem = new KubeFileSystem({} as any);
    const execCommand = vi
      .spyOn(fileSystem, 'execCommand')
      .mockImplementation(async (_namespace, _pod, _container, command) => {
        if (command[0] === 'date') return '+0000\n';
        if (command.at(-1) === '/var/www') {
          return [
            'total 8',
            '-rw-r--r-- 1 root root 12 2026-09-08 10:00:00.000000000 +0000 "index.php"',
            'lrwxrwxrwx 1 root root 9 2026-09-08 10:00:00.000000000 +0000 "lock" -> "/run/lock"'
          ].join('\n');
        }
        if (command.at(-1) === '/run/lock') {
          throw 'ls: /run/lock: No such file or directory';
        }
        throw new Error(`Unexpected command: ${command.join(' ')}`);
      });

    await expect(
      fileSystem.ls({
        namespace: 'ns-demo',
        podName: 'demo-pod',
        containerName: 'app',
        path: '/var/www',
        showHidden: false
      })
    ).resolves.toMatchObject({
      directories: [],
      files: [{ name: 'index.php' }, { name: 'lock', kind: 'l' }]
    });
    expect(execCommand).toHaveBeenCalledWith('ns-demo', 'demo-pod', 'app', [
      'ls',
      '-ldQ',
      '--color=never',
      '/run/lock'
    ]);
  });
});
