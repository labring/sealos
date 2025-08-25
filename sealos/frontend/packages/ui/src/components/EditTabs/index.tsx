import { useMemo } from 'react';
import { Box, Grid } from '@chakra-ui/react';
import type { GridProps } from '@chakra-ui/react';

const EditTabs = <T extends string>({
  list,
  size = 'md',
  activeId,
  onChange,
  ...props
}: {
  list: { id: T; label: string }[];
  activeId: T;
  size?: 'sm' | 'md' | 'lg';
  onChange: (id: T) => void;
} & Omit<GridProps, 'onChange'>) => {
  const sizeMap = useMemo(() => {
    switch (size) {
      case 'sm':
        return {
          fontSize: 'sm',
          outP: '3px',
          inlineP: 1
        };
      case 'md':
        return {
          fontSize: 'md',
          outP: '4px',
          inlineP: 2
        };
      case 'lg':
        return {
          fontSize: 'lg',
          outP: '5px',
          inlineP: 3
        };
    }
  }, [size]);
  const activeIndex = useMemo(
    () => list.findIndex((item) => item.id === activeId),
    [activeId, list]
  );
  return (
    <Grid
      border={'1px solid #DEE0E2'}
      gridTemplateColumns={`repeat(${list.length},1fr)`}
      p={sizeMap.outP}
      borderRadius={'sm'}
      backgroundColor={'white_.600'}
      fontSize={sizeMap.fontSize}
      {...props}
    >
      {list.map((item, i) => (
        <Box
          key={item.id}
          p={sizeMap.inlineP}
          borderRadius={'sm'}
          position={'relative'}
          textAlign={'center'}
          zIndex={1}
          _before={{
            content: '""',
            position: 'absolute',
            right: '0',
            top: '50%',
            transform: 'translateY(-50%)',
            w: i === list.length - 1 || i === activeIndex || i === activeIndex - 1 ? '0' : '1px',
            h: '10px',
            bg: '#DEE0E2'
          }}
          {...(activeId === item.id
            ? {
                boxShadow: '0px 2px 2px rgba(137, 156, 171, 0.25)',
                backgroundColor: 'white',
                cursor: 'default'
              }
            : {
                cursor: 'pointer'
              })}
          onClick={() => {
            if (activeId === item.id) return;
            onChange(item.id);
          }}
        >
          {<Box minWidth={'max-content'}>{item.label}</Box>}
        </Box>
      ))}
    </Grid>
  );
};

export default EditTabs;
