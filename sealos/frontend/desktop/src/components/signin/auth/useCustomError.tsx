import { Flex, Img, Button, Text } from '@chakra-ui/react';
import React, { useState, useEffect } from 'react';
import warnIcon from 'public/icons/warning.svg';
import closeIcon from 'public/icons/close_white.svg';
import { useTranslation } from 'next-i18next';
import { I18nCommonKey } from '@/types/i18next';

const useCustomError = () => {
  const { t } = useTranslation();
  const [error, setError] = useState<I18nCommonKey | null>();

  const showError = (errorMessage: I18nCommonKey, duration = 5000) => {
    setError(errorMessage);
    setTimeout(() => {
      setError(null);
    }, duration);
  };

  const closeError = () => {
    setError(null);
  };

  const ErrorComponent = () => {
    useEffect(() => {
      if (error) {
        const timeout = setTimeout(() => {
          closeError();
        }, 5000); // 默认 5000 毫秒（5秒）后自动关闭错误消息
        return () => clearTimeout(timeout);
      }
    }, [error]);

    return error ? (
      <Flex
        position={'absolute'}
        top="0"
        bg={'rgba(249, 78, 97, 1)'}
        transform={'translateY(-50%)'}
        width="266px"
        minH="42px"
        mb="14px"
        borderRadius="4px"
        p="10px"
      >
        <Img src={warnIcon.src} mr={'8px'} />
        <Text color={'#fff'}>{t(error)}</Text>
        <Button
          variant={'unstyled'}
          ml={'auto'}
          display={'flex'}
          justifyContent={'flex-end'}
          onClick={closeError}
        >
          <Img src={closeIcon.src} />
        </Button>
      </Flex>
    ) : null;
  };

  return { showError, ErrorComponent };
};

export default useCustomError;
