'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface StepperContextValue {
  activeStep: number;
  orientation: 'vertical' | 'horizontal';
  totalSteps: number;
}

const StepperContext = React.createContext<StepperContextValue>({
  activeStep: 0,
  orientation: 'horizontal',
  totalSteps: 0
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
  const childrenArray = React.Children.toArray(children);
  const totalSteps = childrenArray.length;

  return (
    <StepperContext.Provider value={{ activeStep, orientation, totalSteps }}>
      <div
        data-orientation={orientation}
        className={cn(
          'relative flex w-full',
          orientation === 'vertical' ? 'flex-col' : 'flex-row',
          `gap-${gap}`,
          className
        )}
        {...props}
      >
        {React.Children.map(childrenArray, (child, index) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              ...child.props,
              index,
              isLastStep: index === totalSteps - 1
            });
          }
          return child;
        })}
      </div>
    </StepperContext.Provider>
  );
}

interface StepProps extends React.HTMLAttributes<HTMLDivElement> {
  index?: number;
  isLastStep?: boolean;
}

function Step({ className, children, index = 0, isLastStep = false, ...props }: StepProps) {
  const { orientation } = React.useContext(StepperContext);

  return (
    <div
      data-step-index={index}
      className={cn(
        'relative flex w-full',
        orientation === 'vertical' ? 'flex-row gap-2' : 'flex-col items-center',
        className
      )}
      {...props}
    >
      {!isLastStep && (
        <div
          className={cn(
            'absolute bg-neutral-200',
            orientation === 'vertical'
              ? 'top-8 left-3 h-[calc(100%-32px)] w-0.25'
              : 'top-3 left-8 h-0.25 w-[calc(100%-32px)]'
          )}
        />
      )}
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            ...child.props,
            index: index
          });
        }
        return child;
      })}
    </div>
  );
}

function StepIndicator({
  className,
  children,
  index,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { index?: number }) {
  return (
    <div
      className={cn(
        'relative z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center gap-2.5 rounded-full bg-neutral-200 text-xs/4 font-semibold',
        className
      )}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            ...child.props,
            index: index
          });
        }
        return child;
      })}
    </div>
  );
}

export { Stepper, Step, StepIndicator };
