import { Avatar, Box, Flex, FlexProps, HStack, Text, VStack, Image } from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckIcon } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { useState, useEffect } from 'react';
import BoringAvatar from 'boring-avatars';

const NsListItem = ({
  isSelected,
  isPrivate,
  displayPoint = false,
  teamName,
  selectedColor = 'white',
  showCheck = false,
  teamAvatar,
  ...flexprop
}: {
  displayPoint: boolean;
  teamName: string;
  isPrivate: boolean;
  isSelected: boolean;
  selectedColor?: string;
  showCheck?: boolean;
  teamAvatar?: string;
} & FlexProps) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return (
    <Flex
      align={'center'}
      px={'8px'}
      position={'relative'}
      onClick={(e) => {
        e.preventDefault();
        queryClient.invalidateQueries({ queryKey: ['teamList'] });
      }}
      cursor={'pointer'}
      {...flexprop}
    >
      <HStack
        align={'center'}
        width={'full'}
        px={'8px'}
        borderRadius={'8px'}
        p={'6px 8px'}
        _hover={{
          bg: '#F4F4F5'
        }}
        bg={isSelected ? selectedColor : 'transparent'}
      >
        {teamAvatar && (
          <Box boxSize={'24px'}>
            <BoringAvatar
              size={24}
              name={teamAvatar}
              colors={['#ff9e9e', '#b4f8cc', '#4294ff', '#ffe5f0', '#03e2db']}
            />
          </Box>
        )}
        <Text textTransform={'capitalize'}>
          {/* {isPrivate ? t('common:default_team') : teamName} */}
          {teamName}
        </Text>
        {isSelected && showCheck && (
          <CheckIcon style={{ marginLeft: 'auto' }} size={16} color={'#1C4EF5'} />
        )}
      </HStack>
    </Flex>
  );
};

export default NsListItem;
