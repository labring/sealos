import { Box, Flex, FlexProps, HStack, Text, VStack } from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';

const NsListItem = ({
  isSelected,
  isPrivate,
  displayPoint = false,
  teamName,
  selectedColor = 'white',
  ...flexprop
}: {
  displayPoint: boolean;
  teamName: string;
  isPrivate: boolean;
  isSelected: boolean;
  selectedColor?: string;
} & FlexProps) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return (
    <Flex
      align={'center'}
      p="6px 4px"
      mb="2px"
      position={'relative'}
      borderRadius="4px"
      onClick={(e) => {
        e.preventDefault();
        queryClient.invalidateQueries({ queryKey: ['teamList'] });
      }}
      cursor={'pointer'}
      {...flexprop}
      {...(isSelected
        ? {
            background: 'rgba(255, 244, 244, 0.10)'
          }
        : {
            bgColor: 'unset'
          })}
      _hover={{
        '> .namespace-option': {
          display: 'flex'
        },
        bgColor: 'rgba(255, 244, 244, 0.10)'
      }}
    >
      <HStack gap={'8px'} align={'center'} width={'full'}>
        <Box
          h="8px"
          w={displayPoint ? '8px' : '0'}
          m="4px"
          borderRadius="50%"
          bgColor={isSelected ? '#47C8BF' : '#9699B4'}
        />
        <Text
          {...(isSelected
            ? {
                color: selectedColor
              }
            : {})}
          textTransform={'capitalize'}
        >
          {isPrivate ? t('common:default_team') : teamName}
        </Text>
      </HStack>
    </Flex>
  );
};

export default NsListItem;
