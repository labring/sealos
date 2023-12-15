import { Box, BoxProps } from '@chakra-ui/react';
import { StreamLanguage } from '@codemirror/language';
import { yaml } from '@codemirror/legacy-modes/mode/yaml';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { vscodeKeymap } from '@replit/codemirror-vscode-keymap';
import { basicSetup } from 'codemirror';
import { useEffect, useRef, useState } from 'react';

export default function Editor({
  onDocChange,
  ...styles
}: { onDocChange: (x: EditorState) => void } & BoxProps) {
  const [init, setInit] = useState(true);
  const extensions = [
    basicSetup,
    keymap.of(vscodeKeymap),
    StreamLanguage.define(yaml),
    EditorView.updateListener.of((update) => {
      // persist
      const store = update.state.toJSON();
      localStorage.setItem('yamlEditor', JSON.stringify(store));
      if (update.docChanged || init) onDocChange(update.state);
      init && setInit(false);
    })
  ];
  const getState = () => {
    try {
      return EditorState.create({
        ...EditorState.fromJSON(JSON.parse(localStorage.getItem('yamlEditor')!)),
        extensions
      });
    } catch (err) {
      return undefined;
    }
  };
  const ref = useRef(null);
  useEffect(() => {
    const view = new EditorView({
      state: getState(),
      extensions, // indentOnInput(),
      parent: ref.current!
    });
    return () => view && view.destroy();
  }, []);

  return <Box ref={ref} {...styles} />;
}
