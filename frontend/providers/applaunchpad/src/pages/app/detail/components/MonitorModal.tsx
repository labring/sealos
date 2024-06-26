import { delAppByName } from '@/api/app';
import PodLineChart from '@/components/PodLineChart';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import { useAppStore } from '@/store/app';
import {
  Box,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useTheme
} from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useCallback, useState } from 'react';

const MonitorModal = ({ onClose, isOpen }: { isOpen: boolean; onClose: () => void }) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const { message: toast } = useMessage();
  const router = useRouter();
  const { appDetail = MOCK_APP_DETAIL } = useAppStore();
  const theme = useTheme();

  return (
    <Modal isOpen={isOpen} onClose={onClose} autoFocus={false} lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent maxW={'90vw'}>
        <ModalHeader>{t('Real-time Monitoring')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody fontSize={'12px'} fontWeight={'bold'} color={'grayModern.900'}>
          <Box
            p={'24px'}
            bg={'grayModern.25'}
            border={theme.borders.base}
            mb={'16px'}
            borderRadius={'lg'}
          >
            <Box mb={'12px'}>
              CPU&ensp;({appDetail.usedCpu.yData[appDetail.usedCpu.yData.length - 1]}%)
            </Box>
            <Box height={'100px'}>
              <PodLineChart type={'blue'} data={appDetail.usedCpu} isShowLabel />
            </Box>
          </Box>
          <Box p={'24px'} bg={'grayModern.25'} border={theme.borders.base} borderRadius={'lg'}>
            <Box mb={'12px'}>
              {t('Memory')}&ensp;(
              {appDetail.usedMemory.yData[appDetail.usedMemory.yData.length - 1]}%)
            </Box>
            <Box height={'100px'}>
              <PodLineChart type={'purple'} data={appDetail.usedMemory} isShowLabel />
            </Box>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default MonitorModal;
