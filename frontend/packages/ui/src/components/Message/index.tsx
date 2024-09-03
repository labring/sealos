import { AlertStatus, Box, Center, Flex, UseToastOptions, useToast } from '@chakra-ui/react';
import CloseIcon from '../icons/CloseIcon';
import GeneralIcon from '../icons/GeneralIcon';
import SuccessIcon from '../icons/SuccessIcon';
import WarningIcon from '../icons/WarningIcon';
interface CustomToastOptions extends UseToastOptions {
  infoBoxBg?: string;
  errorBoxBg?: string;
  successBoxBg?: string;
  warningBoxBg?: string;
  loadingBoxBg?: string;

  infoIconBg?: string;
  infoIconFill?: string;

  errorIconBg?: string;
  errorIconFill?: string;

  warningIconBg?: string;
  warningIconFill?: string;

  successIconBg?: string;
  successIconFill?: string;

  loadingIconBg?: string;
  loadingIconFill?: string;
}
export default function useMessage(props?: CustomToastOptions) {
  const statusMap: Record<AlertStatus, { bg: string; icon: JSX.Element; boxBg?: string }> = {
    info: {
      bg: props?.infoIconBg || '#DBF3FF',
      icon: <GeneralIcon w={'16px'} h="16px" fill={props?.infoIconFill || '#0884DD'} />,
      boxBg: props?.infoBoxBg
    },
    error: {
      bg: props?.errorIconBg || '#FEE4E2',
      icon: <CloseIcon w={'16px'} h="16px" fill={props?.errorIconFill || '#D92D20'} />,
      boxBg: props?.errorBoxBg
    },
    success: {
      bg: props?.successIconBg || '#D0F5DC',
      icon: <SuccessIcon w={'16px'} h="16px" fill={props?.successIconFill || '#039855'} />,
      boxBg: props?.successBoxBg
    },
    warning: {
      bg: props?.warningIconBg || '#FEF0C7',
      icon: <WarningIcon w={'16px'} h="16px" fill={props?.warningIconFill || '#D97706'} />,
      boxBg: props?.warningBoxBg
    },

    loading: {
      bg: props?.loadingIconBg || '#FEF0C7',
      icon: <WarningIcon w={'16px'} h="16px" fill={props?.loadingIconFill || '#D97706'} />,
      boxBg: props?.loadingBoxBg
    }
  };

  const renderStatusIcon = (status: AlertStatus) => {
    const { bg, icon } = statusMap[status];
    return (
      <Center bg={bg} borderRadius={'full'} p={1}>
        {icon}
      </Center>
    );
  };

  const renderStatusBoxBg = (status: AlertStatus) => {
    const { boxBg } = statusMap[status];
    return boxBg;
  };

  const message = useToast({
    position: 'top',
    ...props,
    render: (props) => {
      return (
        <Box
          position={'relative'}
          background={renderStatusBoxBg(props?.status || 'info') || 'white'}
          py={props?.description ? '16px' : '12px'}
          px={5}
          fontSize={'md'}
          borderRadius={'lg'}
          boxShadow={
            '0px 0px 1px 0px rgba(19, 51, 107, 0.08), 0px 4px 10px 0px rgba(19, 51, 107, 0.08)'
          }
        >
          <Flex alignItems={props?.description ? 'start' : 'center'} gap={'12px'}>
            {renderStatusIcon(props?.status || 'info')}
            <Box flex={1} color={'sealosGrayModern.900'}>
              {props?.title && (
                <Box
                  fontSize={props?.description ? '16px' : '14px'}
                  fontWeight={props?.description ? 500 : 400}
                  mb={props?.description ? '6px' : '0px'}
                  whiteSpace={'normal'}
                  wordBreak={'break-word'}
                >
                  {props?.title}
                </Box>
              )}
              {props?.description && (
                <Box
                  fontSize={'14px'}
                  fontWeight={400}
                  whiteSpace={'normal'}
                  wordBreak={'break-word'}
                >
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
