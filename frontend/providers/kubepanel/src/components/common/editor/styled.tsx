import { EditorProps } from '@monaco-editor/react';
import dynamic from 'next/dynamic';
import { Spin } from 'antd';
import { useEffect } from 'react';
import { monacoTheme } from '@/constants/theme';

const Editor = dynamic(
  () => import('@monaco-editor/react').then((mod) => ({ default: mod.Editor })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[70vh] border-solid border-[1px] border-color-border rounded-lg bg-[#FBFBFC]">
        <Spin size="large" />
      </div>
    )
  }
);

export default function StyledEditor(props: EditorProps) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('monaco-editor').then((monaco) => {
        try {
          monaco.editor.defineTheme('kubepanel', monacoTheme);
        } catch (e) {
          console.warn('Failed to define Monaco theme:', e);
        }
      });
    }
  }, []);

  return (
    <div className="pt-5 border-solid border-[1px] border-color-border rounded-lg bg-[#FBFBFC]">
      <Editor {...props} height={'70vh'} theme="kubepanel" loading={<Spin />} />
    </div>
  );
}
