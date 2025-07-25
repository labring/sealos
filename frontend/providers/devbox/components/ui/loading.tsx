'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  fixed?: boolean;
  size?: 'sm' | 'default' | 'lg';
  loading?: boolean;
}

function Loading({
  className,
  fixed = true,
  size = 'default',
  loading = true,
  ...props
}: LoadingProps) {
  if (!loading) return null;

  return (
    <div
      data-slot="loading"
      className={cn(
        'flex items-center justify-center bg-background/50',
        fixed ? 'fixed inset-0 z-50' : 'absolute inset-0',
        className
      )}
      {...props}
    >
      <Loader2
        className={cn(
          'animate-spin',
          size === 'sm' && 'size-4',
          size === 'default' && 'size-6',
          size === 'lg' && 'size-8'
        )}
      />
    </div>
  );
}

export { Loading };
