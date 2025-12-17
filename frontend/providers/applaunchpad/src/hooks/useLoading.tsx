import { useState, useCallback } from 'react';
import { Spinner, Flex, FlexProps } from '@chakra-ui/react';

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
      backdropProps?: FlexProps;
    }): JSX.Element | null => {
      return (
        <Flex
          position={fixed ? 'fixed' : 'absolute'}
          zIndex={100}
          backgroundColor={'rgba(244,244,247,0.5)'}
          top={0}
          left={0}
          right={0}
          bottom={0}
          alignItems={'center'}
          justifyContent={'center'}
          visibility={isLoading || loading ? 'visible' : 'hidden'}
          {...backdropProps}
        >
          <Spinner
            thickness="4px"
            speed="0.65s"
            emptyColor="grayModern.200"
            color="blue.500"
            size="xl"
          />
        </Flex>
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
