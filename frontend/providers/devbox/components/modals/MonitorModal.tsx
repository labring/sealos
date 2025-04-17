import {
  Box,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useTheme
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';

import PodLineChart from '@/components/PodLineChart';
import { useDevboxStore } from '@/stores/devbox';

const MonitorModal = ({ onClose, isOpen }: { isOpen: boolean; onClose: () => void }) => {
  const theme = useTheme();
  const t = useTranslations();
  const { devboxDetail } = useDevboxStore();

  return (
    <Modal isOpen={isOpen} onClose={onClose} autoFocus={false} lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent maxW={'90vw'}>
        <ModalHeader>{t('monitor')}</ModalHeader>
        <ModalCloseButton />
        {devboxDetail && (
          <ModalBody fontSize={'12px'} fontWeight={'bold'} color={'grayModern.900'}>
            <Box
              p={'24px'}
              bg={'grayModern.25'}
              border={theme.borders.base}
              mb={'16px'}
              borderRadius={'lg'}
            >
              <Box mb={'12px'}>
                CPU&ensp;({devboxDetail.usedCpu.yData[devboxDetail.usedCpu.yData.length - 1]}%)
              </Box>
              <Box height={'100px'}>
                <PodLineChart type={'blue'} data={devboxDetail.usedCpu} isShowLabel />
              </Box>
            </Box>
            <Box p={'24px'} bg={'grayModern.25'} border={theme.borders.base} borderRadius={'lg'}>
              <Box mb={'12px'}>
                {t('memory')}&ensp;(
                {devboxDetail.usedMemory.yData[devboxDetail.usedMemory.yData.length - 1]}%)
              </Box>
              <Box height={'100px'}>
                <PodLineChart type={'purple'} data={devboxDetail.usedMemory} isShowLabel />
              </Box>
            </Box>
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
};

export default MonitorModal;
