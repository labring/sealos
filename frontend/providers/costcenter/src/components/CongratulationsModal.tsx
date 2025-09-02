import { Modal, ModalContent, ModalOverlay, Flex, Text, Button, Box, Img } from '@chakra-ui/react';
import { CheckCircle } from 'lucide-react';
import { forwardRef, useImperativeHandle, useState } from 'react';
import congratulationsIcon from '@/../public/congratulations.svg';

interface CongratulationsModalProps {
  planName?: string;
  maxResources?: {
    cpu: string;
    memory: string;
    storage: string;
  };
  traffic?: number;
  onClose?: () => void;
}

const CongratulationsModal = forwardRef<
  { onOpen: () => void; onClose: () => void },
  CongratulationsModalProps
>((props, ref) => {
  const { onClose } = props;
  const [isOpen, setIsOpen] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      onOpen: () => setIsOpen(true),
      onClose: () => {
        setIsOpen(false);
        onClose?.();
      }
    }),
    [onClose]
  );

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  // Format plan resources
  const formatCpu = (cpu: string) => {
    const cpuNum = parseFloat(cpu);
    return `${cpuNum} vCPU`;
  };

  const formatMemory = (memory: string) => {
    return memory.replace('Gi', 'GB RAM');
  };

  const formatStorage = (storage: string) => {
    return storage.replace('Gi', 'GB Disk');
  };

  const formatTraffic = (traffic: number) => {
    const trafficGB = Math.floor(traffic / 1024);
    return `${trafficGB}GB Traffic`;
  };

  const benefits = {
    cpu: props.maxResources?.cpu ? formatCpu(props.maxResources.cpu) : '2 vCPU',
    memory: props.maxResources?.memory ? formatMemory(props.maxResources.memory) : '2GB RAM',
    storage: props.maxResources?.storage ? formatStorage(props.maxResources.storage) : '5GB Disk',
    traffic: props.traffic ? formatTraffic(props.traffic) : '1GB Traffic'
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered>
      <ModalOverlay bg="rgba(0, 0, 0, 0.12)" backdropFilter="blur(15px)" />
      <ModalContent
        maxW="520px"
        bg="white"
        borderRadius="16px"
        p="0"
        overflow="hidden"
        position="relative"
      >
        {/* Background illustration */}
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          height="200px"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Img
            src={congratulationsIcon.src}
            alt="Congratulations"
            maxHeight="180px"
            objectFit="contain"
          />
        </Box>

        <Flex
          direction="column"
          align="center"
          justify="center"
          px="40px"
          py="48px"
          position="relative"
          zIndex={1}
        >
          {/* Congratulations Header */}
          <Text
            fontSize="28px"
            fontWeight="700"
            color="var(--color-zinc-900)"
            mb="16px"
            textAlign="center"
          >
            Congratulations
          </Text>

          <Text
            fontSize="16px"
            color="var(--color-zinc-600)"
            mb="32px"
            textAlign="center"
            lineHeight="1.5"
          >
            You have upgraded to {props.planName || 'Pro Plan'}, these benefits are
            <br />
            already unlocked.
          </Text>

          {/* Benefits List */}
          <Flex direction="column" gap="12px" mb="32px" w="100%">
            <Flex align="center" gap="12px">
              <CheckCircle size={20} color="#10B981" />
              <Text fontSize="16px" color="var(--color-zinc-700)">
                {benefits.cpu}
              </Text>
            </Flex>
            <Flex align="center" gap="12px">
              <CheckCircle size={20} color="#10B981" />
              <Text fontSize="16px" color="var(--color-zinc-700)">
                {benefits.memory}
              </Text>
            </Flex>
            <Flex align="center" gap="12px">
              <CheckCircle size={20} color="#10B981" />
              <Text fontSize="16px" color="var(--color-zinc-700)">
                {benefits.storage}
              </Text>
            </Flex>
            <Flex align="center" gap="12px">
              <CheckCircle size={20} color="#10B981" />
              <Text fontSize="16px" color="var(--color-zinc-700)">
                {benefits.traffic}
              </Text>
            </Flex>
          </Flex>

          {/* Close Button */}
          <Button
            w="100%"
            h="48px"
            bg="var(--color-zinc-100)"
            color="var(--color-zinc-700)"
            borderRadius="8px"
            fontSize="16px"
            fontWeight="500"
            border="1px solid var(--color-zinc-200)"
            _hover={{
              bg: 'var(--color-zinc-200)'
            }}
            onClick={handleClose}
          >
            Close
          </Button>
        </Flex>
      </ModalContent>
    </Modal>
  );
});

CongratulationsModal.displayName = 'CongratulationsModal';

export default CongratulationsModal;
