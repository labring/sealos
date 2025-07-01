'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Circle } from 'lucide-react';

interface StepperContextValue {
  activeStep: number;
  orientation: 'vertical' | 'horizontal';
}

const StepperContext = React.createContext<StepperContextValue>({
  activeStep: 0,
  orientation: 'horizontal'
});

interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  activeStep?: number;
  orientation?: 'vertical' | 'horizontal';
  gap?: number;
}

function Stepper({
  activeStep = 0,
  orientation = 'horizontal',
  gap = 4,
  className,
  children,
  ...props
}: StepperProps) {
  return (
    <StepperContext.Provider value={{ activeStep, orientation }}>
      <div
        data-orientation={orientation}
        className={cn(
          'flex',
          orientation === 'vertical' ? 'flex-col' : 'flex-row',
          `gap-${gap}`,
          className
        )}
        {...props}
      >
        {children}
      </div>
    </StepperContext.Provider>
  );
}

interface StepProps extends React.HTMLAttributes<HTMLDivElement> {
  index?: number;
}

function Step({ className, children, index = 0, ...props }: StepProps) {
  const { orientation } = React.useContext(StepperContext);
  return (
    <div
      className={cn(
        'relative flex',
        orientation === 'vertical' ? 'flex-col' : 'flex-row items-center',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function StepIndicator({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative flex h-8 w-8 items-center justify-center rounded-full bg-gray-100',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function StepSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { orientation } = React.useContext(StepperContext);
  return (
    <div
      className={cn(
        'flex-1 bg-gray-200',
        orientation === 'vertical' ? 'ml-4 w-px' : 'h-px',
        className
      )}
      {...props}
    />
  );
}

function StepStatus({
  className,
  incomplete,
  complete,
  active,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  incomplete?: React.ReactNode;
  complete?: React.ReactNode;
  active?: React.ReactNode;
}) {
  const { activeStep } = React.useContext(StepperContext);
  const status = activeStep === 0 ? 'incomplete' : activeStep === 1 ? 'active' : 'complete';

  return (
    <div className={cn('flex items-center justify-center', className)} {...props}>
      {status === 'incomplete' && incomplete}
      {status === 'active' && active}
      {status === 'complete' && complete}
    </div>
  );
}

function StepNumber({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex h-6 w-6 items-center justify-center text-sm font-medium', className)}
      {...props}
    />
  );
}

function StepCircle({ className, ...props }: React.ComponentProps<typeof Circle>) {
  return <Circle className={cn('h-2 w-2', className)} {...props} />;
}

export { Stepper, Step, StepIndicator, StepSeparator, StepStatus, StepNumber, StepCircle };
