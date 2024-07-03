import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberInput,
  NumberInputField,
  Select,
  Stack,
  Switch,
  Textarea,
  useDisclosure,
  VStack,
  SimpleGrid,
  Radio,
  RadioGroup
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { ProbeType } from '@/types/app';
import React, { useEffect, useState } from 'react';
import MyIcon from '@/components/Icon';
import { ValueOf } from 'next/dist/shared/lib/constants';

interface EditProbeProps {
  probeType: 'livenessProbe' | 'readinessProbe' | 'startupProbe';
  defaultProbe?: ProbeType;
  onSuccess: (data: ProbeType) => void;
}

const EditProbe: React.FC<EditProbeProps> = ({ probeType, defaultProbe, onSuccess }) => {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [probe, setProbe] = useState<ProbeType>(defaultProbe || { use: false });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (probe.use) {
      if (probe.initialDelaySeconds !== undefined && probe.initialDelaySeconds < 0) {
        newErrors.initialDelaySeconds = t('Value must be greater than or equal to 0');
      }
      if (
        probe.periodSeconds !== undefined &&
        (probe.periodSeconds < 1 || probe.periodSeconds > 3600)
      ) {
        newErrors.periodSeconds = t('Value must be between 1 and 3600');
      }
      if (
        probe.timeoutSeconds !== undefined &&
        (probe.timeoutSeconds < 1 || probe.timeoutSeconds > 3600)
      ) {
        newErrors.timeoutSeconds = t('Value must be between 1 and 3600');
      }
      if (probe.successThreshold !== undefined && probe.successThreshold < 1) {
        newErrors.successThreshold = t('Value must be greater than or equal to 1');
      }
      if (probe.failureThreshold !== undefined && probe.failureThreshold < 1) {
        newErrors.failureThreshold = t('Value must be greater than or equal to 1');
      }
      if (
        probe.terminationGracePeriodSeconds !== undefined &&
        probe.terminationGracePeriodSeconds < 1
      ) {
        newErrors.terminationGracePeriodSeconds = t('Value must be greater than or equal to 1');
      }
      if (
        probe.httpGet &&
        ((probe.httpGet.port as number) < 1 || (probe.httpGet.port as number) > 65535)
      ) {
        newErrors.httpGetPort = t('Value must be between 1 and 65535');
      }
      if (
        probe.tcpSocket &&
        ((probe.tcpSocket.port as number) < 1 || (probe.tcpSocket.port as number) > 65535)
      ) {
        newErrors.tcpSocketPort = t('Value must be between 1 and 65535');
      }
      if (probe.grpc?.port !== undefined && (probe.grpc.port < 1 || probe.grpc.port > 65535)) {
        newErrors.grpcPort = t('Value must be between 1 and 65535');
      }
      if (probe.httpGet?.scheme && !['HTTP', 'HTTPS'].includes(probe.httpGet.scheme)) {
        newErrors.httpGetScheme = t('Scheme must be either HTTP or HTTPS');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSuccess(probe);
      onClose();
    }
  };

  const handleInputChange = (
    field: keyof Omit<ProbeType, 'use' | 'exec' | 'httpGet' | 'tcpSocket' | 'grpc'>,
    value: string | number
  ) => {
    setProbe((prevProbe) => ({
      ...prevProbe,
      [field]: value
    }));
  };

  const handleExecChange = (command: string[]) => {
    setProbe((prevProbe) => ({
      ...prevProbe,
      exec: { command },
      httpGet: undefined,
      tcpSocket: undefined,
      grpc: undefined
    }));
  };

  const handleHttpGetChange = (
    field: keyof NonNullable<ProbeType['httpGet']>,
    value: ValueOf<NonNullable<ProbeType['httpGet']>>
  ) => {
    setProbe((prevProbe) => ({
      ...prevProbe,
      httpGet: {
        ...prevProbe.httpGet,
        port: prevProbe.httpGet?.port || 80,
        [field]: value
      },
      exec: undefined,
      tcpSocket: undefined,
      grpc: undefined
    }));
  };

  const handleTcpSocketChange = (
    field: keyof NonNullable<ProbeType['tcpSocket']>,
    value: string | number
  ) => {
    setProbe((prevProbe) => ({
      ...prevProbe,
      tcpSocket: {
        ...prevProbe.tcpSocket,
        port: prevProbe.tcpSocket?.port || 80,
        [field]: value
      },
      exec: undefined,
      httpGet: undefined,
      grpc: undefined
    }));
  };

  const handleGrpcChange = (
    field: keyof NonNullable<ProbeType['grpc']>,
    value: string | number
  ) => {
    setProbe((prevProbe) => ({
      ...prevProbe,
      grpc: {
        ...prevProbe.grpc,
        port: prevProbe.grpc?.port || 80,
        [field]: value
      },
      exec: undefined,
      httpGet: undefined,
      tcpSocket: undefined
    }));
  };

  return (
    <>
      <Button
        w={'100%'}
        variant={'outline'}
        fontSize={'base'}
        leftIcon={<MyIcon name="edit" width={'16px'} fill={'#485264'} />}
        onClick={onOpen}
      >
        {t(`Edit ${probeType}`)}
      </Button>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent maxW="600px">
          <ModalHeader>{t(`Edit ${probeType}`)}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="start" w="100%">
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
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="100%">
                    <FormControl isInvalid={!!errors.initialDelaySeconds}>
                      <FormLabel>{t('initialDelaySeconds')}</FormLabel>
                      <NumberInput
                        value={probe.initialDelaySeconds || ''}
                        onChange={(valueString) =>
                          handleInputChange('initialDelaySeconds', Number(valueString))
                        }
                        min={0}
                      >
                        <NumberInputField />
                      </NumberInput>
                      {errors.initialDelaySeconds && (
                        <FormErrorMessage>{errors.initialDelaySeconds}</FormErrorMessage>
                      )}
                    </FormControl>
                    <FormControl isInvalid={!!errors.periodSeconds}>
                      <FormLabel>{t('periodSeconds')}</FormLabel>
                      <NumberInput
                        value={probe.periodSeconds || ''}
                        onChange={(valueString) =>
                          handleInputChange('periodSeconds', Number(valueString))
                        }
                        min={1}
                        max={3600}
                      >
                        <NumberInputField />
                      </NumberInput>
                      {errors.periodSeconds && (
                        <FormErrorMessage>{errors.periodSeconds}</FormErrorMessage>
                      )}
                    </FormControl>
                    <FormControl isInvalid={!!errors.timeoutSeconds}>
                      <FormLabel>{t('timeoutSeconds')}</FormLabel>
                      <NumberInput
                        value={probe.timeoutSeconds || ''}
                        onChange={(valueString) =>
                          handleInputChange('timeoutSeconds', Number(valueString))
                        }
                        min={1}
                        max={3600}
                      >
                        <NumberInputField />
                      </NumberInput>
                      {errors.timeoutSeconds && (
                        <FormErrorMessage>{errors.timeoutSeconds}</FormErrorMessage>
                      )}
                    </FormControl>
                    <FormControl isInvalid={!!errors.successThreshold}>
                      <FormLabel>{t('successThreshold')}</FormLabel>
                      <NumberInput
                        value={probe.successThreshold || ''}
                        onChange={(valueString) =>
                          handleInputChange('successThreshold', Number(valueString))
                        }
                        min={1}
                      >
                        <NumberInputField />
                      </NumberInput>
                      {errors.successThreshold && (
                        <FormErrorMessage>{errors.successThreshold}</FormErrorMessage>
                      )}
                    </FormControl>
                    <FormControl isInvalid={!!errors.failureThreshold}>
                      <FormLabel>{t('failureThreshold')}</FormLabel>
                      <NumberInput
                        value={probe.failureThreshold || ''}
                        onChange={(valueString) =>
                          handleInputChange('failureThreshold', Number(valueString))
                        }
                        min={1}
                      >
                        <NumberInputField />
                      </NumberInput>
                      {errors.failureThreshold && (
                        <FormErrorMessage>{errors.failureThreshold}</FormErrorMessage>
                      )}
                    </FormControl>
                    <FormControl isInvalid={!!errors.terminationGracePeriodSeconds}>
                      <FormLabel>{t('terminationGracePeriodSeconds')}</FormLabel>
                      <NumberInput
                        value={probe.terminationGracePeriodSeconds || ''}
                        onChange={(valueString) =>
                          handleInputChange('terminationGracePeriodSeconds', Number(valueString))
                        }
                        min={1}
                      >
                        <NumberInputField />
                      </NumberInput>
                      {errors.terminationGracePeriodSeconds && (
                        <FormErrorMessage>{errors.terminationGracePeriodSeconds}</FormErrorMessage>
                      )}
                    </FormControl>
                  </SimpleGrid>
                  <FormControl as={Stack} spacing={4} w="100%">
                    <FormLabel>{t('Probe Type')}</FormLabel>
                    <Select
                      value={
                        probe.exec
                          ? 'exec'
                          : probe.httpGet
                          ? 'httpGet'
                          : probe.tcpSocket
                          ? 'tcpSocket'
                          : probe.grpc
                          ? 'grpc'
                          : ''
                      }
                      onChange={(e) => {
                        if (
                          e.target.value === 'exec' ||
                          e.target.value === 'httpGet' ||
                          e.target.value === 'tcpSocket' ||
                          e.target.value === 'grpc'
                        ) {
                          setProbe((prevProbe) => ({
                            ...prevProbe,
                            exec: e.target.value === 'exec' ? { command: [] } : undefined,
                            httpGet:
                              e.target.value === 'httpGet' ? { port: 80, path: '/' } : undefined,
                            tcpSocket: e.target.value === 'tcpSocket' ? { port: 80 } : undefined,
                            grpc: e.target.value === 'grpc' ? { port: 80 } : undefined
                          }));
                          return;
                        }
                        setProbe((prevProbe) => ({
                          ...prevProbe,
                          exec: undefined,
                          httpGet: undefined,
                          tcpSocket: undefined,
                          grpc: undefined
                        }));
                      }}
                    >
                      <option value="">{t('None')}</option>
                      <option value="exec">{t('Exec')}</option>
                      <option value="httpGet">{t('HTTP Get')}</option>
                      <option value="tcpSocket">{t('TCP Socket')}</option>
                      <option value="grpc">{t('gRPC')}</option>
                    </Select>
                    {probe.exec && (
                      <FormControl isInvalid={!!errors.execCommand}>
                        <FormLabel>{t('Command')}</FormLabel>
                        <Textarea
                          value={probe.exec.command?.join(' ') || ''}
                          onChange={(e) => handleExecChange(e.target.value.split(' '))}
                        />
                        {errors.execCommand && (
                          <FormErrorMessage>{errors.execCommand}</FormErrorMessage>
                        )}
                      </FormControl>
                    )}
                    {probe.httpGet && (
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="100%">
                        <FormControl isInvalid={!!errors.httpGetPort}>
                          <FormLabel>{t('Port')}</FormLabel>
                          <NumberInput
                            value={probe.httpGet.port}
                            onChange={(valueString) =>
                              handleHttpGetChange('port', Number(valueString))
                            }
                            min={1}
                            max={65535}
                          >
                            <NumberInputField />
                          </NumberInput>
                          {errors.httpGetPort && (
                            <FormErrorMessage>{errors.httpGetPort}</FormErrorMessage>
                          )}
                        </FormControl>
                        <FormControl>
                          <FormLabel>{t('Path')}</FormLabel>
                          <Input
                            w="100%"
                            value={probe.httpGet.path}
                            onChange={(e) => handleHttpGetChange('path', e.target.value)}
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel>{t('Host')}</FormLabel>
                          <Input
                            w="100%"
                            value={probe.httpGet.host || ''}
                            onChange={(e) => handleHttpGetChange('host', e.target.value)}
                          />
                        </FormControl>
                        <FormControl isInvalid={!!errors.httpGetScheme}>
                          <FormLabel>{t('Scheme')}</FormLabel>
                          <RadioGroup
                            value={probe.httpGet.scheme || 'HTTP'}
                            onChange={(value) => handleHttpGetChange('scheme', value)}
                          >
                            <HStack spacing="24px">
                              <Radio value="HTTP">HTTP</Radio>
                              <Radio value="HTTPS">HTTPS</Radio>
                            </HStack>
                          </RadioGroup>
                          {errors.httpGetScheme && (
                            <FormErrorMessage>{errors.httpGetScheme}</FormErrorMessage>
                          )}
                        </FormControl>
                        <FormControl gridColumn={{ base: 'span 1', md: 'span 2' }}>
                          <FormLabel>{t('HTTP Headers')}</FormLabel>
                          <Textarea
                            value={
                              probe.httpGet.httpHeaders
                                ?.map((header) => `${header.name}: ${header.value}`)
                                .join('\n') || ''
                            }
                            onChange={(e) =>
                              handleHttpGetChange(
                                'httpHeaders',
                                e.target.value.split('\n').map((line) => {
                                  const [name, value] = line.split(': ');
                                  return { name, value: value || '' };
                                })
                              )
                            }
                          />
                        </FormControl>
                      </SimpleGrid>
                    )}
                    {probe.tcpSocket && (
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="100%">
                        <FormControl isInvalid={!!errors.tcpSocketPort}>
                          <FormLabel>{t('Port')}</FormLabel>
                          <NumberInput
                            value={probe.tcpSocket.port}
                            onChange={(valueString) =>
                              handleTcpSocketChange('port', Number(valueString))
                            }
                            min={1}
                            max={65535}
                          >
                            <NumberInputField />
                          </NumberInput>
                          {errors.tcpSocketPort && (
                            <FormErrorMessage>{errors.tcpSocketPort}</FormErrorMessage>
                          )}
                        </FormControl>
                        <FormControl>
                          <FormLabel>{t('Host')}</FormLabel>
                          <Input
                            w="100%"
                            value={probe.tcpSocket.host || ''}
                            onChange={(e) => handleTcpSocketChange('host', e.target.value)}
                          />
                        </FormControl>
                      </SimpleGrid>
                    )}
                    {probe.grpc && (
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="100%">
                        <FormControl isInvalid={!!errors.grpcPort}>
                          <FormLabel>{t('Port')}</FormLabel>
                          <NumberInput
                            value={probe.grpc.port}
                            onChange={(valueString) =>
                              handleGrpcChange('port', Number(valueString))
                            }
                            min={1}
                            max={65535}
                          >
                            <NumberInputField />
                          </NumberInput>
                          {errors.grpcPort && (
                            <FormErrorMessage>{errors.grpcPort}</FormErrorMessage>
                          )}
                        </FormControl>
                        <FormControl>
                          <FormLabel>{t('Service')}</FormLabel>
                          <Input
                            w="100%"
                            value={probe.grpc.service || ''}
                            onChange={(e) => handleGrpcChange('service', e.target.value)}
                          />
                        </FormControl>
                      </SimpleGrid>
                    )}
                  </FormControl>
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
