import { useState, useCallback } from 'react';
import { Loading as ShadcnLoading } from '@sealos/shadcn-ui/loading';
import { cn } from '@sealos/shadcn-ui';

export const useLoading = (props?: { defaultLoading: boolean }) => {
  const [isLoading, setIsLoading] = useState(props?.defaultLoading || false);

  const Loading = useCallback(
    ({
      loading,
      fixed = true,
      backdropProps
    }: {
      loading?: boolean;
      fixed?: boolean;
      backdropProps?: React.HTMLAttributes<HTMLDivElement> & { style?: React.CSSProperties };
    }): JSX.Element | null => {
      const shouldShow = isLoading === true || loading === true;

      return (
        <ShadcnLoading
          loading={shouldShow}
          fixed={fixed}
          size="lg"
          className={cn('z-[100] bg-[rgba(244,244,247,0.5)]', backdropProps?.className)}
          style={backdropProps?.style}
        />
      );
    },
    [isLoading]
  );

  return {
    isLoading,
    setIsLoading,
    Loading
  };
};
