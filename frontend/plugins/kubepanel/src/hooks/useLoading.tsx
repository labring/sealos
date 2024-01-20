import { useState, useCallback } from 'react';
import { Flex } from '@chakra-ui/react';
import { Spin } from 'antd';
export const useLoading = (props?: { defaultLoading: boolean }) => {
  const [isLoading, setIsLoading] = useState(props?.defaultLoading || false);

  const Loading = useCallback(
    ({ loading, fixed = true }: { loading?: boolean; fixed?: boolean }): JSX.Element | null => {
      return (
        <Flex
          position={fixed ? 'fixed' : 'absolute'}
          zIndex={100}
          backgroundColor={'rgba(255,255,255,0.5)'}
          top={0}
          left={0}
          right={0}
          bottom={0}
          alignItems={'center'}
          justifyContent={'center'}
          visibility={isLoading || loading ? 'visible' : 'hidden'}
        >
          <Spin size="large" spinning={loading} />
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
