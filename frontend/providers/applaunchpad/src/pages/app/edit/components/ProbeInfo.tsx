import React from 'react';
import { Box, Text, VStack } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { ProbeType } from '@/types/app';

const ProbeInfo: React.FC<{ probe: ProbeType }> = ({ probe }) => {
  const { t } = useTranslation();

  if (!probe.use) {
    return null;
  }

  return (
    <Box pl="120px" mb={4}>
      <VStack align="start" spacing={2}>
        <Text fontSize="sm" color="gray.500">
          {t('initialDelaySeconds')}: {probe.initialDelaySeconds || 0}
        </Text>
        <Text fontSize="sm" color="gray.500">
          {t('periodSeconds')}: {probe.periodSeconds || 0}
        </Text>
        <Text fontSize="sm" color="gray.500">
          {t('timeoutSeconds')}: {probe.timeoutSeconds || 0}
        </Text>
        <Text fontSize="sm" color="gray.500">
          {t('successThreshold')}: {probe.successThreshold || 0}
        </Text>
        <Text fontSize="sm" color="gray.500">
          {t('failureThreshold')}: {probe.failureThreshold || 0}
        </Text>
        {probe.exec && (
          <Text fontSize="sm" color="gray.500">
            {t('Exec Command')}: {probe.exec.command.join(' ')}
          </Text>
        )}
        {probe.httpGet && (
          <>
            <Text fontSize="sm" color="gray.500">
              {t('HTTP Get Path')}: {probe.httpGet.path}
            </Text>
            <Text fontSize="sm" color="gray.500">
              {t('HTTP Get Port')}: {probe.httpGet.port}
            </Text>
          </>
        )}
        {probe.tcpSocket && (
          <Text fontSize="sm" color="gray.500">
            {t('TCP Socket Port')}: {probe.tcpSocket.port}
          </Text>
        )}
      </VStack>
    </Box>
  );
};

export default ProbeInfo;
