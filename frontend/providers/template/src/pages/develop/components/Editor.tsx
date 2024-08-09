import { Box, BoxProps } from '@chakra-ui/react';
import { StreamLanguage } from '@codemirror/language';
import { yaml } from '@codemirror/legacy-modes/mode/yaml';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { vscodeKeymap } from '@replit/codemirror-vscode-keymap';
import { basicSetup } from 'codemirror';
import { useEffect, useRef, useState, memo } from 'react';
import { debounce } from 'lodash';

function Editor({
  onDocChange,
  ...styles
}: { onDocChange: (x: EditorState) => void } & BoxProps) {
  const [init, setInit] = useState(true);
  const extensions = [
    basicSetup,
    keymap.of(vscodeKeymap),
    StreamLanguage.define(yaml),
    EditorView.updateListener.of((update) => {
      debouncedOnDocChange(update);
    })
  ];

  const debouncedOnDocChange = debounce((update) => {
    // persist
    localStorage.setItem('developEditor', update.state.doc.toString());
    if (update.docChanged || init) onDocChange(update.state);
    init && setInit(false);
  }, 300);

  const ref = useRef(null);
  useEffect(() => {
    const storage = localStorage.getItem('developEditor')

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