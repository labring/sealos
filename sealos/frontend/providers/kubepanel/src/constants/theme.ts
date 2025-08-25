import { ThemeConfig } from 'antd';
import { editor } from 'monaco-editor';

export const theme: ThemeConfig = {
  components: {
    Menu: {
      itemSelectedBg: '#1118240D',
      itemSelectedColor: '#0884DD',
      itemHoverColor: '#485264',
      itemHoverBg: '#1118240D',
      itemColor: '#485264'
    },
    Collapse: {
      headerPadding: 0
    },
    Table: {
      headerBorderRadius: 0,
      headerBg: '#F6F8F9'
    },
    Tooltip: {
      colorBgSpotlight: '#FFFFFF',
      colorTextLightSolid: '#000000'
    }
  },
  token: {
    controlItemBgHover: '#1118240D'
  },
  cssVar: true
};

export const monacoTheme: editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: false,
  rules: [
    {
      token: 'string',
      foreground: 'E82F72'
    },
    {
      token: 'symbol',
      foreground: '027A48'
    },
    {
      token: 'number',
      foreground: '667085'
    },
    {
      token: 'comment',
      foreground: '9E53C1'
    },
    {
      token: 'operators',
      foreground: '027A48'
    },
    {
      token: 'keyword',
      foreground: '00A9A6'
    }
  ],
  colors: {
    'editor.foreground': '#0770BC',
    'editor.background': '#FBFBFC',
    'editor.selectionBackground': '#DBF3FF',
    'editor.lineHighlightBackground': '#F4F4F7',
    'editorLineNumber.foreground': '#787A90',
    'editorLineNumber.activeForeground': '#219bf4',
    'editorCursor.foreground': '#111824',
    'editorWhitespace.foreground': '#BBBBBB'
  }
};
