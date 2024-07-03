import React from 'react';
import { Box, Text, SimpleGrid } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { ProbeType } from '@/types/app';

const ProbeInfo: React.FC<{ probe: ProbeType }> = ({ probe }) => {
  const { t } = useTranslation();

  if (!probe.use) {
    return null;
  }

  const getProbeType = () => {
    if (probe.exec) return 'Exec';
    if (probe.httpGet) return 'HTTP Get';
    if (probe.tcpSocket) return 'TCP Socket';
    if (probe.grpc) return 'gRPC';
    return 'None';
  };

  return (
    <Box pl="120px" mb={4}>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        <Text fontSize="sm" color="gray.500">
          {t('Probe Type')}: {t(getProbeType())}
        </Text>
        <Text fontSize="sm" color="gray.500">
          {t('initialDelaySeconds')}: {probe.initialDelaySeconds || 0}
        </Text>
        <Text fontSize="sm" color="gray.500">
          {t('periodSeconds')}: {probe.periodSeconds || 0}
        </Text>
        {probe.terminationGracePeriodSeconds !== undefined && (
          <Text fontSize="sm" color="gray.500">
            {t('terminationGracePeriodSeconds')}: {probe.terminationGracePeriodSeconds}
          </Text>
        )}
        <Text fontSize="sm" color="gray.500">
          {t('timeoutSeconds')}: {probe.timeoutSeconds || 0}
        </Text>
        <Text fontSize="sm" color="gray.500">
          {t('successThreshold')}: {probe.successThreshold || 0}
        </Text>
        <Text fontSize="sm" color="gray.500">
          {t('failureThreshold')}: {probe.failureThreshold || 0}
        </Text>
        {probe.exec && probe.exec.command && (
          <Text fontSize="sm" color="gray.500">
            {t('Exec Command')}: {probe.exec.command.join(' ') || ''}
          </Text>
        )}
        {probe.httpGet && (
          <>
            <Text fontSize="sm" color="gray.500">
              {t('HTTP Get Port')}: {probe.httpGet.port}
            </Text>
            {probe.httpGet.path && (
              <Text fontSize="sm" color="gray.500">
                {t('HTTP Get Path')}: {probe.httpGet.path}
              </Text>
            )}
            {probe.httpGet.host && (
              <Text fontSize="sm" color="gray.500">
                {t('HTTP Get Host')}: {probe.httpGet.host}
              </Text>
            )}
            {probe.httpGet.scheme && (
              <Text fontSize="sm" color="gray.500">
                {t('HTTP Get Scheme')}: {probe.httpGet.scheme}
              </Text>
            )}
            {probe.httpGet.httpHeaders && probe.httpGet.httpHeaders.length > 0 && (
              <Text fontSize="sm" color="gray.500">
                {t('HTTP Get Headers')}:{' '}
                {probe.httpGet.httpHeaders
                  .map((header) => `${header.name}: ${header.value}`)
                  .join(', ')}
              </Text>
            )}
          </>
        )}
        {probe.tcpSocket && (
          <>
            <Text fontSize="sm" color="gray.500">
              {t('TCP Socket Port')}: {probe.tcpSocket.port}
            </Text>
            {probe.tcpSocket.host && (
              <Text fontSize="sm" color="gray.500">
                {t('TCP Socket Host')}: {probe.tcpSocket.host}
              </Text>
            )}
          </>
        )}
        {probe.grpc && (
          <>
            <Text fontSize="sm" color="gray.500">
              {t('gRPC Port')}: {probe.grpc.port}
            </Text>
            {probe.grpc.service && (
              <Text fontSize="sm" color="gray.500">
                {t('gRPC Service')}: {probe.grpc.service}
              </Text>
            )}
          </>
        )}
      </SimpleGrid>
    </Box>
  );
};

export default ProbeInfo;
