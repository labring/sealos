import { Flex, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import React from 'react';
import { IdeaIcon } from '../icons';

interface FloatingTaskButtonProps {
  onClick: () => void;
}

const FloatingTaskButton: React.FC<FloatingTaskButtonProps> = ({ onClick }) => {
  const { t } = useTranslation();

  return (
    <Flex
      cursor={'pointer'}
      flexDirection={'column'}
      position="fixed"
      bottom="80px"
      right="0px"
      zIndex={5}
      borderRadius="var(--md, 8px) 0px 0px var(--md, 8px)"
      border="1px solid rgba(255, 255, 255, 0.07)"
      borderRight={'none'}
      background="linear-gradient(0deg, rgba(49, 84, 231, 0.25) 0%, rgba(49, 84, 231, 0.25) 100%), rgba(220, 220, 224, 0.20)"
      backgroundBlendMode="saturation, normal"
      boxShadow="0px 12px 64px -4px rgba(0, 0, 0, 0.20)"
      backdropFilter="blur(50px)"
      padding="8px 6px"
      alignItems="center"
      gap="2px"
      onClick={onClick}
      _hover={{
        bg: 'linear-gradient(0deg, rgba(49, 84, 231, 0.25) 0%, rgba(49, 84, 231, 0.25) 100%), rgba(220, 220, 224, 0.10)'
      }}
    >
      <IdeaIcon color={'white'} width={'28px'} height={'28px'} />
      <Text fontSize={'11px'} fontWeight={'500'} color={'white'}>
        {t('common:newuser_benefit')}
      </Text>
    </Flex>
  );
};

export default FloatingTaskButton;
