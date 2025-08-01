'use client';

import * as React from 'react';
import { XIcon } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

import { cn } from '@/lib/utils';

interface DrawerProps extends React.ComponentProps<typeof DialogPrimitive.Root> {
  direction?: 'left' | 'right' | 'top' | 'bottom';
}

function Drawer({ direction = 'right', ...props }: DrawerProps) {
  return <DialogPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="drawer-close" {...props} />;
}

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      data-slot="drawer-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  );
});
DrawerOverlay.displayName = 'DrawerOverlay';

interface DrawerContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  direction?: 'left' | 'right' | 'top' | 'bottom';
  showCloseButton?: boolean;
}

function DrawerContent({
  className,
  children,
  direction = 'right',
  showCloseButton = true,
  ...props
}: DrawerContentProps) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DialogPrimitive.Content
        data-slot="drawer-content"
        data-direction={direction}
        className={cn(
          'fixed z-50 m-3 flex h-full min-w-[450px] flex-col rounded-2xl bg-zinc-50 shadow-lg duration-300',
          // Top drawer styles
          direction === 'top' && 'inset-x-0 top-0 animate-in border-b slide-in-from-top',
          // Bottom drawer styles
          direction === 'bottom' && 'inset-x-0 bottom-0 animate-in border-t slide-in-from-bottom',
          // Right drawer styles
          direction === 'right' &&
            'inset-y-0 right-0 h-[calc(100vh-24px)] w-3/4 animate-in border-l slide-in-from-right sm:max-w-sm',
          // Left drawer styles
          direction === 'left' &&
            'inset-y-0 left-0 h-[calc(100vh-24px)] w-3/4 animate-in border-r slide-in-from-left sm:max-w-sm',
          // Animation states
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          direction === 'top' && 'data-[state=closed]:slide-out-to-top',
          direction === 'bottom' && 'data-[state=closed]:slide-out-to-bottom',
          direction === 'right' && 'data-[state=closed]:slide-out-to-right',
          direction === 'left' && 'data-[state=closed]:slide-out-to-left',
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="drawer-close"
            className="absolute top-4 right-4 cursor-pointer rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:pointer-events-none"
          >
            <XIcon className="size-5 text-neutral-500" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        'flex min-h-14 flex-col items-start justify-center gap-4 rounded-t-2xl border-b bg-white px-6',
        className
      )}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn(
        'sticky bottom-0 mt-auto flex h-14 flex-col-reverse items-center gap-2 rounded-b-2xl border-t bg-zinc-50 px-6 py-4 sm:flex-row sm:justify-end',
        className
      )}
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="drawer-title"
      className={cn('text-lg leading-none font-semibold tracking-tight text-foreground', className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="drawer-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription
};
