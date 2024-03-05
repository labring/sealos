import { Editor, EditorProps } from '@monaco-editor/react';

export default function StyledEditor(props: EditorProps) {
  return (
    <div className="pt-5 border-solid border-[1px] border-color-border rounded-lg bg-[#FBFBFC]">
      <Editor {...props} height={'70vh'} theme="kubepanel" />
    </div>
  );
}
