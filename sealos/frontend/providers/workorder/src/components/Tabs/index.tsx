import React, { useMemo } from 'react';
import { Box, Grid, useBreakpointValue } from '@chakra-ui/react';
import type { GridProps } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';

// @ts-ignore
interface Props extends GridProps {
  list: { id: string; label: string }[];
  activeId: string;
  size?: 'sm' | 'md' | 'lg';
  onChange: (id: string) => void;
}

const Tabs = ({ list, size = 'md', activeId, onChange, ...props }: Props) => {
  const { t } = useTranslation();
  const pxValue = useBreakpointValue({ base: '14px', lg: '20px' });

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
          inlineP: '4px'
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
      backgroundColor={'myWhite.600'}
      fontSize={sizeMap.fontSize}
      {...props}
    >
      {list.map((item, i) => (
        <Box
          key={item.id}
          py={sizeMap.inlineP}
          borderRadius={'sm'}
          position={'relative'}
          textAlign={'center'}
          zIndex={1}
          px={pxValue}
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
          <Box>{t(item.label)}</Box>
        </Box>
      ))}
    </Grid>
  );
};

export default Tabs;
