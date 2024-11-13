import { extendTheme } from '@chakra-ui/react'
import { theme as SealosTheme } from '@sealos/ui'

export const theme = extendTheme(SealosTheme, {
  styles: {
    global: {
      'html, body': {
        color: 'var(--foreground)',
        background: 'var(--background)',
        fontSize: 'md',
        height: '100%',
        overflowY: 'auto',
        fontWeight: 400,
        minWidth: '700px'
      }
    }
  }
})
