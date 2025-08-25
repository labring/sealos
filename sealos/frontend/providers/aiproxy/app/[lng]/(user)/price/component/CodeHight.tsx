import React from 'react'
import { Box } from '@chakra-ui/react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

const CodeBlock = ({ code, language = 'bash' }: { code: string; language?: string }) => {
  const customizedStyle = {
    ...atomDark,
    'pre[class*="language-"]': {
      ...atomDark['pre[class*="language-"]'],
      backgroundColor: 'transparent',
      margin: 0,
      padding: 0
    }
  }

  return (
    <Box
      overflowX="auto"
      sx={{
        '&::-webkit-scrollbar': {
          width: 0,
          height: 0
        },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',

        '& pre': {
          '&::-webkit-scrollbar': {
            width: 0,
            height: 0
          },
          msOverflowStyle: 'none !important',
          scrollbarWidth: 'none !important'
        },
        '& code': {
          '&::-webkit-scrollbar': {
            width: 0,
            height: 0
          },
          msOverflowStyle: 'none !important',
          scrollbarWidth: 'none !important'
        }
      }}>
      <SyntaxHighlighter
        language={language}
        style={customizedStyle}
        customStyle={{
          fontSize: '12px',
          overflowX: 'auto',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }}
        codeTagProps={{
          style: {
            color: 'white'
          }
        }}
        wrapLines={false}
        lineProps={{ style: { whiteSpace: 'pre' } }}>
        {code}
      </SyntaxHighlighter>
    </Box>
  )
}

export default CodeBlock
