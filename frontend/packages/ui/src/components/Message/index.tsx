import { AlertStatus, Box, Center, Flex, UseToastOptions, useToast } from '@chakra-ui/react';
import CloseIcon from '../icons/CloseIcon';
import WarningIcon from '../icons/WarningIcon';
import SuccessIcon from '../icons/SuccessIcon';

export default function useMessage(props?: UseToastOptions) {
  const statusMap: Record<AlertStatus, { bg: string; icon: JSX.Element }> = {
    info: { bg: 'yellow.50', icon: <WarningIcon /> },
    error: { bg: 'red.50', icon: <CloseIcon w={'16px'} h="16px" fill={'#D92D20'} /> },
    success: { bg: '#EDFBF3', icon: <SuccessIcon w={'16px'} h="16px" fill={'#039855'} /> },
    warning: { bg: 'yellow.50', icon: <WarningIcon /> },
    loading: { bg: 'yellow.50', icon: <WarningIcon /> }
  };

  const renderStatusIcon = (status: AlertStatus) => {
    const { bg, icon } = statusMap[status];
    return (
      <Center bg={bg} borderRadius={'full'} p={1}>
        {icon}
      </Center>
    );
  };

  const message = useToast({
    position: 'top',
    isClosable: true,
    ...props,
    render: (props) => {
      return (
        <Box
          position={'relative'}
          background={'white'}
          py={3}
          px={5}
          fontSize={'md'}
          borderRadius={'lg'}
          boxShadow={
            '0px 0px 1px 0px rgba(19, 51, 107, 0.08), 0px 4px 10px 0px rgba(19, 51, 107, 0.08)'
          }
        >
          <Flex alignItems={'start'} gap={'12px'}>
            {renderStatusIcon(props?.status || 'info')}
            <Box flex={1} color={'sealosGrayModern.900'}>
              {props?.title && (
                <Box fontSize={'16px'} fontWeight={500} mb="4px">
                  {props?.title}
                </Box>
              )}
              {props?.description && (
                <Box fontSize={'14px'} fontWeight={40}>
                  {props?.description}
                </Box>
              )}
            </Box>
            {props?.isClosable && (
              <Center
                borderRadius={'md'}
                p={'4px'}
                _hover={{ bg: 'rgba(0, 0, 0, 0.06)' }}
                cursor={'pointer'}
                onClick={props.onClose}
              >
                <CloseIcon w="16px" h="16px" fill={'black'} />
              </Center>
            )}
          </Flex>
        </Box>
      );
    }
  });

  return {
    message
  };
}
