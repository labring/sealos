import { Modal, ModalContent, ModalOverlay, Flex, Text, Box, Img, Divider } from '@chakra-ui/react';
import { CheckCircle } from 'lucide-react';
import congratulationsIcon from '@/../public/congratulations.svg';
import { Button } from '@sealos/shadcn-ui';
import { formatTrafficAuto } from '@/utils/format';

interface CongratulationsModalProps {
  planName?: string;
  maxResources?: {
    cpu: string;
    memory: string;
    storage: string;
  };
  traffic?: number;
  onClose: () => void;
  isOpen: boolean;
}

export default function CongratulationsModal(props: CongratulationsModalProps) {
  const { onClose, isOpen } = props;

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

  const benefits = {
    cpu: props.maxResources?.cpu ? formatCpu(props.maxResources.cpu) : '2 vCPU',
    memory: props.maxResources?.memory ? formatMemory(props.maxResources.memory) : '2GB RAM',
    storage: props.maxResources?.storage ? formatStorage(props.maxResources.storage) : '5GB Disk',
    traffic: props.traffic ? formatTrafficAuto(props.traffic) : '1GB Traffic'
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered closeOnOverlayClick={false}>
      <ModalOverlay bg="rgba(0, 0, 0, 0.12)" backdropFilter="blur(15px)" />
      <ModalContent
        maxW="378px"
        bg="white"
        borderRadius="16px"
        p="0"
        overflow="hidden"
        position="relative"
      >
        <Box display="flex" alignItems="center" justifyContent="center" w="100%">
          <Img
            src={congratulationsIcon.src}
            alt="Congratulations"
            maxHeight="180px"
            objectFit="contain"
            draggable={false}
          />
        </Box>
        <Flex direction="column" align="start" position="relative" p={'24px'}>
          <Text
            fontSize="28px"
            fontWeight="700"
            color="var(--color-zinc-900)"
            mb="8px"
            textAlign="start"
          >
            Congratulations
          </Text>

          <Text fontSize="16px" color="var(--color-zinc-600)" textAlign="start" lineHeight="1.5">
            You have upgraded to {props.planName || 'Pro Plan'}, these benefits are already
            unlocked.
          </Text>
          <Divider my="8px" borderColor={'#F4F4F5'} />
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

          <Button variant={'outline'} className="w-full" onClick={onClose}>
            Close
          </Button>
        </Flex>
      </ModalContent>
    </Modal>
  );
}
