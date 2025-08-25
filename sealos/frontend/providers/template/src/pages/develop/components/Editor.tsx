import { Box, BoxProps } from '@chakra-ui/react';
import { StreamLanguage } from '@codemirror/language';
import { yaml } from '@codemirror/legacy-modes/mode/yaml';
import { EditorState, Text } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { vscodeKeymap } from '@replit/codemirror-vscode-keymap';
import { StateField } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { useEffect, useRef, memo } from 'react';
import { debounce } from 'lodash';

function Editor({
  onDocChange,
  ...styles
}: { onDocChange: (x: string) => void } & BoxProps) {
  const ref = useRef(null);
  useEffect(() => {
    const storage = localStorage.getItem('developEditor')

    const debouncedOnDocChange = debounce((doc: Text) => {
      const docStr = doc.toString()
      localStorage.setItem('developEditor', docStr);
      onDocChange(docStr);
    }, 300);

    const extensions = [
      basicSetup,
      keymap.of(vscodeKeymap),
      StreamLanguage.define(yaml),
      StateField.define({
        create: (state) => {
          onDocChange(state.doc.toString())
        },
        update: (_, transaction) => {
          if (transaction.docChanged) {
            debouncedOnDocChange(transaction.newDoc)
          }
        },
      })
    ];

    const view = new EditorView({
      state: EditorState.create({
        doc: storage || '',
        extensions
      }),
      extensions,
      parent: ref.current!
    });
    return () => view && view.destroy();
  }, []);

  return <Box ref={ref} {...styles} />;
}

export default memo(Editor);