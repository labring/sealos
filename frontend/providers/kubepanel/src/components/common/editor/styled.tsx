import { monacoTheme } from '@/constants/theme';
import { EditorProps } from '@monaco-editor/react';
import { Spin } from 'antd';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';

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

interface StyledEditorProps extends EditorProps {
  wrapperClassName?: string;
}

export default function StyledEditor({ wrapperClassName = '', ...props }: StyledEditorProps) {
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
    <div
      className={`pt-5 border-solid border-[1px] border-color-border rounded-lg bg-[#FBFBFC] ${wrapperClassName}`}
    >
      <Editor
        height={'70vh'}
        theme="kubepanel"
        loading={<Spin />}
        options={{
          minimap: { enabled: false }, // Hide minimap
          scrollBeyondLastLine: false, // Remove whitespace at bottom
          scrollbar: {
            useShadows: false,
            vertical: 'auto'
          },
          ...props.options // Allow overrides
        }}
        {...props}
      />
    </div>
  );
}
