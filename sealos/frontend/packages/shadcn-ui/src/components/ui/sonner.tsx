'use client';

import * as React from 'react';
import { Toaster as Sonner, ToasterProps } from 'sonner';

interface ToasterComponentProps extends ToasterProps {
  theme?: 'light' | 'dark' | 'system';
}

const Toaster = ({ theme = 'system', ...props }: ToasterComponentProps) => {
  return (
    <Sonner
      richColors
      position="top-center"
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)'
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
