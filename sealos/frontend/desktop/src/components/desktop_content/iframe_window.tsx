import useAppStore from '@/stores/app';
import { useMemo } from 'react';
import styles from './index.module.scss';

export default function Iframe_window({ pid }: { pid: number }) {
  const findAppInfo = useAppStore((state) => state.findAppInfoById);
  const app = findAppInfo(pid);
  const url = useMemo(() => app?.data?.url || '', [app?.data?.url]);
  if (!url) return null;

  return (
    <iframe
      className={styles.iframeContainer}
      src={url}
      allow="camera;microphone;clipboard-write;clipboard-read;"
      id={`app-window-${app?.key}`}
    />
  );
}
