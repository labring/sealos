import React, { useMemo } from 'react';
import { BoxProps, Flex, Box } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';

interface Props extends BoxProps {
  text: string;
  icon?: JSX.Element;
  theme?: 'blue';
  size?: 'sm' | 'md' | 'lg';
}

const Tip = ({ size = 'md', text, icon, theme, ...props }: Props) => {
  const { t } = useTranslation();
  const sizeMap = useMemo(() => {
    switch (size) {
      case 'sm':
        return {
          fontSize: '12px',
          px: 3,
          py: 1
        };
      case 'md':
        return {
          fontSize: '14px',
          px: 4,
          py: 2
        };
      case 'lg':
        return {
          fontSize: '16px',
          px: 5,
          py: 2
        };
      default:
        return {};
    }
  }, [size]);
  const themeMap = useMemo(() => {
    switch (theme) {
      case 'blue':
        return {
          color: '#0884DD',
          bg: '#ECF8FF'
        };
      default:
        return {
          color: '#0884DD',
          bg: '#ECF8FF'
        };
    }
  }, [theme]);

  return (
    <Flex
      alignItems={'center'}
      borderRadius={'sm'}
      {...sizeMap}
      {...themeMap}
      whiteSpace={'nowrap'}
      {...props}
    >
      {icon ? (
        <Flex alignItems={'center'} mr={2} w={sizeMap.fontSize} h={sizeMap.fontSize}>
          {icon}
        </Flex>
      ) : null}
      {t(text)}
    </Flex>
  );
};

export default Tip;
