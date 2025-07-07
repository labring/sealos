import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, ...props }, ref) => {
    return (
      <div className="relative flex w-full items-center">
        {icon && (
          <div className="pointer-events-none absolute left-3 flex h-full items-center">{icon}</div>
        )}
        <input
          type={type}
          data-slot="input"
          className={cn(
            'flex h-9 w-full min-w-0 gap-1 rounded-lg border border-input bg-transparent py-1 text-sm transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-zinc-500 disabled:pointer-events-none disabled:cursor-not-allowed disabled:text-zinc-500/50 md:text-sm dark:bg-input/30',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
            'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
            icon ? 'pr-3 pl-9' : 'px-3',
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
