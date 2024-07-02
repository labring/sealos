import {
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Switch,
  Text,
  useDisclosure,
  VStack
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { ProbeType } from '@/types/app';
import React, { useEffect, useState } from 'react';

interface EditProbeProps {
  probeType: 'livenessProbe' | 'readinessProbe' | 'startupProbe';
  defaultProbe?: ProbeType;
  onSuccess: (data: ProbeType) => void;
}

const EditProbe: React.FC<EditProbeProps> = ({ probeType, defaultProbe, onSuccess }) => {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [probe, setProbe] = useState<ProbeType>(defaultProbe || { use: false });

  useEffect(() => {
    setProbe(defaultProbe || { use: false });
  }, [defaultProbe]);

  const handleSave = () => {
    onSuccess(probe);
    onClose();
  };

  const handleInputChange = (field: keyof Omit<ProbeType, 'use'>, value: string | number) => {
    setProbe((prevProbe) => ({
      ...prevProbe,
      [field]: value
    }));
  };

  return (
    <>
      <Button onClick={onOpen}>{t(`Edit ${probeType}`)}</Button>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t(`Edit ${probeType}`)}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="start">
              <FormControl>
                <FormLabel>{t('Enable Probe')}</FormLabel>
                <Switch
                  isChecked={probe.use}
                  onChange={(e) =>
                    setProbe((prevProbe) => ({ ...prevProbe, use: e.target.checked }))
                  }
                />
              </FormControl>
              {probe.use && (
                <>
                  <FormControl>
                    <FormLabel>{t('initialDelaySeconds')}</FormLabel>
                    <Input
                      type="number"
                      value={probe.initialDelaySeconds || ''}
                      onChange={(e) =>
                        handleInputChange('initialDelaySeconds', Number(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>{t('periodSeconds')}</FormLabel>
                    <Input
                      type="number"
                      value={probe.periodSeconds || ''}
                      onChange={(e) => handleInputChange('periodSeconds', Number(e.target.value))}
                    />
                  </FormControl>
                  {/* Add other probe fields here */}
                </>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button colorScheme="blue" ml={3} onClick={handleSave}>
              {t('Save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default EditProbe;
