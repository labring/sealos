import { useCopyData } from '@/hooks/useCopyData';
import { Box, Flex, Text } from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import Iconfont from '../iconfont';
import InviteMember from './InviteMember';
import { NSType, NamespaceDto } from '@/types/team';
import { useTranslation } from 'react-i18next';
const NsList = ({
  click,
  selected_ns_uid,
  namespaces,
  displayPoint = false,
  ...boxprop
}: {
  displayPoint: boolean;
  click?: (ns: NamespaceDto) => void;
  selected_ns_uid: string;
  namespaces: NamespaceDto[];
} & Parameters<typeof Box>[0]) => {
  const queryClient = useQueryClient();
  const { copyData } = useCopyData();
  const { t } = useTranslation();
  return (
    <Box {...boxprop}>
      {namespaces.length > 0 &&
        namespaces.map((ns) => (
          <Flex
            key={ns.id}
            align={'center'}
            py="10px"
            mb="2px"
            position={'relative'}
            borderRadius="2px"
            onClick={(e) => {
              e.preventDefault();
              queryClient.invalidateQueries({ queryKey: ['teamList'] });
              click && click(ns);
            }}
            cursor={'pointer'}
            {...(selected_ns_uid === ns.uid
              ? {
                  background: 'rgba(0, 0, 0, 0.05)'
                }
              : {
                  bgColor: 'unset'
                })}
            px={'4px'}
            _hover={{
              '> .namespace-option': {
                display: 'flex'
              },
              bgColor: 'rgba(0, 0, 0, 0.03)'
            }}
          >
            <Flex align={'center'} width={'full'}>
              <Box
                h="8px"
                w={displayPoint ? '8px' : '0'}
                mr="8px"
                borderRadius="50%"
                bgColor={selected_ns_uid === ns.uid ? '#47C8BF' : '#9699B4'}
              />
              <Text
                fontSize={'14px'}
                {...(selected_ns_uid === ns.uid
                  ? {
                      color: '#0884DD'
                    }
                  : {})}
                textTransform={'capitalize'}
              >
                {ns.nstype === NSType.Private ? t('Default Team') : ns.teamName}
              </Text>
            </Flex>
          </Flex>
        ))}
    </Box>
  );
};

export default NsList;
