import React, { useMemo, useState } from 'react';
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
import { CUSTOM_DOMAIN_CERTIFICATE_DOMAINS } from '@/store/static';
import { useToast } from '@/hooks/useToast';
import { findMatchingCertificateDomain, normalizeDomainName } from '@/utils/custom-domain';

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

  const normalizedDomain = normalizeDomainName(customDomain);
  const matchingCertificateDomain = useMemo(
    () => findMatchingCertificateDomain(normalizedDomain, CUSTOM_DOMAIN_CERTIFICATE_DOMAINS),
    [normalizedDomain]
  );
  const hasCertificateDomainList = CUSTOM_DOMAIN_CERTIFICATE_DOMAINS.length > 0;
  const isDomainCovered = hasCertificateDomainList && Boolean(matchingCertificateDomain);

  const submit = () => {
    if (!normalizedDomain || !domainPattern.test(normalizedDomain)) {
      toast({
        title: t('domain_invalid_toast', { domain: customDomain }),
        status: 'error'
      });
      return;
    }

    if (!isDomainCovered) {
      toast({
        title: hasCertificateDomainList
          ? t('custom_domain_certificate_not_configured', {
              customDomain: normalizedDomain
            })
          : t('custom_domain_certificate_list_empty'),
        status: 'warning'
      });
      return;
    }

    onSuccess(normalizedDomain);
    onClose();
  };

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
              onChange={(event) => setCustomDomain(event.target.value.trim().toLowerCase())}
              bg="#F7F8FA"
              borderColor="#E8EBF0"
              placeholder={t('Input your custom domain') || 'Input your custom domain'}
            />

            <Alert
              variant="subtle"
              borderRadius="lg"
              borderWidth={1}
              borderColor={isDomainCovered ? '#A6EDC3' : '#FED7AA'}
              bg={isDomainCovered ? '#EDFBF3' : '#FFFAEB'}
            >
              <AlertDescription w="full">
                <Flex alignItems="flex-start" gap={3}>
                  {isDomainCovered ? (
                    <ShieldCheck size={18} color="#039855" />
                  ) : (
                    <ShieldCheck size={18} color="#DC6803" />
                  )}
                  <Box>
                    <Text fontWeight={500} color={isDomainCovered ? '#039855' : '#B54708'} mb={1}>
                      {t('custom_domain_certificate_mode_title')}
                    </Text>
                    <Text fontSize="14px" color={isDomainCovered ? '#027A48' : '#B54708'}>
                      {hasCertificateDomainList
                        ? isDomainCovered
                          ? t('custom_domain_certificate_match_tip', {
                              domain: matchingCertificateDomain
                            })
                          : t('custom_domain_certificate_not_configured', {
                              customDomain: normalizedDomain || customDomain
                            })
                        : t('custom_domain_certificate_list_empty')}
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
          <Button leftIcon={<CheckCircle size={16} />} onClick={submit}>
            {t('domain_verification_input_save')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CertificateCustomAccessModal;
