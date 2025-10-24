import { Avatar, Box, Flex, FlexProps, HStack, Text, VStack, Image } from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckIcon } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { useState, useEffect } from 'react';
import BoringAvatar from 'boring-avatars';
import { Badge } from '@sealos/shadcn-ui/badge';
import { cn } from '@sealos/shadcn-ui';
import { getPlanBackgroundClass } from '@/utils/styling';

const NsListItem = ({
  isSelected,
  isPrivate,
  displayPoint = false,
  teamName,
  selectedColor = 'white',
  showCheck = false,
  teamAvatar,
  planName,
  ...flexprop
}: {
  displayPoint: boolean;
  teamName: string;
  isPrivate: boolean;
  isSelected: boolean;
  selectedColor?: string;
  showCheck?: boolean;
  teamAvatar?: string;
  planName?: string;
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
        <Text
          textTransform={'capitalize'}
          textOverflow={'ellipsis'}
          whiteSpace={'nowrap'}
          overflow={'hidden'}
          width={'full'}
        >
          {/* {isPrivate ? t('common:default_team') : teamName} */}
          {teamName}
        </Text>
        {planName && (
          <Badge
            variant={'subscription'}
            className={cn(getPlanBackgroundClass(planName, planName === 'PAYG', false))}
          >
            {planName}
          </Badge>
        )}
        {showCheck && (
          <CheckIcon
            style={{ marginLeft: 'auto' }}
            size={16}
            color={'#1C4EF5'}
            opacity={isSelected ? 1 : 0}
          />
        )}
      </HStack>
    </Flex>
  );
};

export default NsListItem;
