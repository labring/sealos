import React, { useState } from 'react';
import {
  Alert,
  AlertDescription,
  Box,
  Button,
  Flex,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text
} from '@chakra-ui/react';
import { CheckCircle, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { useToast } from '@/hooks/useToast';
import { normalizeDomainName } from '@/utils/custom-domain';
import {
  checkCustomDomainCertificateCoverage,
  type CustomDomainCertificateCoverageResult
} from '@/api/platform';

export type CertificateCustomAccessModalParams = {
  networkIndex: number;
  currentCustomDomain: string;
};

const domainPattern = /^((?!-)[a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,63}$/i;

const CertificateCustomAccessModal = ({
  currentCustomDomain,
  onClose,
  onSuccess
}: CertificateCustomAccessModalParams & {
  onClose: () => void;
  onSuccess: (domain: string) => void;
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [customDomain, setCustomDomain] = useState(currentCustomDomain);
  const [isChecking, setIsChecking] = useState(false);
  const [coverage, setCoverage] = useState<CustomDomainCertificateCoverageResult | null>(null);

  const normalizedDomain = normalizeDomainName(customDomain);
  const isDomainCovered = coverage?.status === 'covered';

  const getCoverageMessage = (result: CustomDomainCertificateCoverageResult | null) => {
    if (isChecking && !result) {
      return t('custom_domain_certificate_checking');
    }

    if (!result) {
      return t('custom_domain_certificate_runtime_tip');
    }

    if (result.status === 'covered') {
      return t('custom_domain_certificate_match_tip', {
        domain: result.matchingDomain
      });
    }

    if (result.status === 'pendingSync') {
      return t('custom_domain_certificate_pending_sync', {
        customDomain: result.customDomain
      });
    }

    if (result.status === 'unsupported') {
      return t('custom_domain_certificate_unavailable');
    }

    return t('custom_domain_certificate_not_configured', {
      customDomain: result.customDomain
    });
  };

  const getCoverageTone = () => {
    if (isDomainCovered) return 'success';
    if (coverage?.status === 'unsupported') return 'error';
    if (coverage?.status === 'pendingSync' || coverage?.status === 'notConfigured') {
      return 'warning';
    }
    return 'info';
  };

  const submit = async () => {
    if (!normalizedDomain || !domainPattern.test(normalizedDomain)) {
      toast({
        title: t('domain_invalid_toast', { domain: customDomain }),
        status: 'error'
      });
      return;
    }

    setIsChecking(true);
    try {
      const result = await checkCustomDomainCertificateCoverage({
        customDomain: normalizedDomain
      });
      setCoverage(result);

      if (result.status !== 'covered') {
        toast({
          title: getCoverageMessage(result),
          status: result.status === 'unsupported' ? 'error' : 'warning'
        });
        return;
      }

      onSuccess(normalizedDomain);
      onClose();
    } catch (error) {
      toast({
        title: t('custom_domain_certificate_unavailable'),
        status: 'error'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const coverageTone = getCoverageTone();
  const coverageColor =
    coverageTone === 'success' ? '#039855' : coverageTone === 'error' ? '#D92D20' : '#DC6803';
  const coverageBorderColor =
    coverageTone === 'success' ? '#A6EDC3' : coverageTone === 'error' ? '#FECDCA' : '#FED7AA';
  const coverageBg =
    coverageTone === 'success' ? '#EDFBF3' : coverageTone === 'error' ? '#FEF3F2' : '#FFFAEB';
  const coverageTextColor =
    coverageTone === 'success' ? '#027A48' : coverageTone === 'error' ? '#B42318' : '#B54708';

  return (
    <Modal isOpen onClose={onClose} lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent maxH="90vh" maxW="90vw" width="520px">
        <ModalHeader>{t('Custom Domain')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack gap={4}>
            <Box>
              <Text fontWeight="bold" mb={2}>
                {t('custom_domain_input_title')}
              </Text>
              <Text color="gray.600" fontSize="14px">
                {t('custom_domain_certificate_input_tip')}
              </Text>
            </Box>

            <Input
              value={customDomain}
              onChange={(event) => {
                setCustomDomain(event.target.value.trim().toLowerCase());
                setCoverage(null);
              }}
              w="full"
              bg="#F7F8FA"
              borderColor="#E8EBF0"
              placeholder={t('Input your custom domain') || 'Input your custom domain'}
            />

            <Alert
              variant="subtle"
              borderRadius="lg"
              borderWidth={1}
              borderColor={coverageBorderColor}
              bg={coverageBg}
            >
              <AlertDescription w="full">
                <Flex alignItems="flex-start" gap={3}>
                  <ShieldCheck size={18} color={coverageColor} />
                  <Box>
                    <Text fontWeight={500} color={coverageColor} mb={1}>
                      {t('custom_domain_certificate_mode_title')}
                    </Text>
                    <Text fontSize="14px" color={coverageTextColor}>
                      {getCoverageMessage(coverage)}
                    </Text>
                  </Box>
                </Flex>
              </AlertDescription>
            </Alert>
          </Stack>
        </ModalBody>
        <ModalFooter gap={3}>
          {currentCustomDomain && (
            <Button
              variant="outline"
              onClick={() => {
                onSuccess('');
                onClose();
              }}
            >
              {t('domain_verification_input_clear')}
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            {t('close')}
          </Button>
          <Button leftIcon={<CheckCircle size={16} />} onClick={submit} isLoading={isChecking}>
            {t('domain_verification_input_save')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CertificateCustomAccessModal;
