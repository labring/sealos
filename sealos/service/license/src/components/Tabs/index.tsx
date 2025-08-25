import React, { useMemo } from 'react';
import { Box, Grid } from '@chakra-ui/react';
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
  const sizeMap = useMemo(() => {
    switch (size) {
      case 'sm':
        return {
          fontSize: 'xs',
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
  return (
    <Grid
      border={'1px solid #E8EBF0'}
      gridTemplateColumns={`repeat(${list.length},1fr)`}
      p={sizeMap.outP}
      borderRadius={'8px'}
      backgroundColor={'gray.50'}
      fontSize={sizeMap.fontSize}
      fontWeight={500}
      {...props}
    >
      {list.map((item) => (
        <Box
          key={item.id}
          px={'2'}
          py={sizeMap.inlineP}
          borderRadius={'6px'}
          textAlign={'center'}
          _hover={{
            color: 'brightBlue.600'
          }}
          {...(activeId === item.id
            ? {
                boxShadow: '0px 2px 2px rgba(137, 156, 171, 0.25)',
                backgroundColor: 'white',
                cursor: 'default',
                color: 'gray.900'
              }
            : {
                cursor: 'pointer',
                color: 'gray.500'
              })}
          onClick={() => {
            if (activeId === item.id) return;
            onChange(item.id);
          }}
        >
          {t(item.label)}
        </Box>
      ))}
    </Grid>
  );
};

export default Tabs;
