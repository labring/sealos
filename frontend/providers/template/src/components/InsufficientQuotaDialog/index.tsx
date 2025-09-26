import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Divider
} from '@chakra-ui/react';
import { WarningIcon } from '@chakra-ui/icons';
import { useTranslation } from 'next-i18next';
import { ExceededWorkspaceQuotaItem, WorkspaceQuotaItemType } from '@/types/workspace';
import { resourcePropertyMap } from '@/constants/resource';
import { sealosApp } from 'sealos-desktop-sdk/app';
import css from './index.module.css';

interface InsufficientQuotaDialogProps {
  items: ExceededWorkspaceQuotaItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  showControls?: boolean;
  showRequirements?: WorkspaceQuotaItemType[];
}

export function InsufficientQuotaDialog({
  items,
  open,
  onOpenChange,
  onConfirm,
  showControls = true,
  showRequirements = []
}: InsufficientQuotaDialogProps) {
  const { t } = useTranslation();

  const handleOpenCostcenter = () => {
    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-costcenter',
      pathname: '/',
      query: {
        mode: 'upgrade'
      },
      messageData: {
        type: 'InternalAppCall',
        mode: 'upgrade'
      }
    });
  };

  return (
    <Modal isOpen={open} onClose={() => onOpenChange(false)} isCentered>
      <ModalOverlay />
      <ModalContent maxW="800px">
        <ModalHeader>
          <Flex alignItems="center" gap={2}>
            <WarningIcon color="orange.500" />
            <Text>{t('insufficient_quota_dialog.title')}</Text>
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Box bg="#FFF7ED" p={4} borderRadius="md">
              <Text>{t('insufficient_quota_dialog.alert-title')}</Text>

              <Divider my={5} borderStyle={'dashed'} borderColor={'gray.300'}></Divider>

              <VStack spacing={3}>
                {items.map((item) => {
                  const props = resourcePropertyMap[item.type];
                  if (!props) return null;

                  const showRequirement = showRequirements.includes(item.type) && !!item.request;

                  return (
                    <Box key={item.type} w="100%">
                      <Flex justify="space-between" align="center" mb={2}>
                        <Flex
                          gap={1}
                          alignItems={'center'}
                          justify={'center'}
                          textColor={'gray.400'}
                        >
                          <props.icon className={css.icon} />
                          <Text fontWeight="medium" textColor="gray.900">
                            {t(item.type)}
                          </Text>
                        </Flex>
                        <HStack spacing={4} fontSize="md" justify={'center'} align={'center'}>
                          <Text>
                            {t('insufficient_quota_dialog.quota_total')}
                            {(item.limit / props.scale).toFixed(2)} {props.unit}
                          </Text>
                          <Divider orientation="vertical" h={4} />
                          <Text>
                            {t('insufficient_quota_dialog.quota_in_use')}
                            {(item.used / props.scale).toFixed(2)} {props.unit}
                          </Text>
                          <Divider orientation="vertical" h={4} />
                          <Text color={showRequirement ? undefined : 'red.500'}>
                            {t('insufficient_quota_dialog.quota_available')}
                            {((item.limit - item.used) / props.scale).toFixed(2)} {props.unit}
                          </Text>
                          {showRequirement && (
                            <>
                              <Divider orientation="vertical" h={4} />
                              <Text color="red.500">
                                {t('insufficient_quota_dialog.quota_required')}
                                {(item.request! / props.scale).toFixed(2)} {props.unit}
                              </Text>
                            </>
                          )}
                        </HStack>
                      </Flex>
                    </Box>
                  );
                })}
              </VStack>
            </Box>

            <Text>
              <Text as="span">{t('insufficient_quota_dialog.please_upgrade_plan.1')}</Text>
              <Text
                as="span"
                color="blue.600"
                textDecoration="underline"
                cursor="pointer"
                fontWeight="semibold"
                onClick={handleOpenCostcenter}
              >
                {t('insufficient_quota_dialog.please_upgrade_plan.2')}
              </Text>
              <Text as="span">{t('insufficient_quota_dialog.please_upgrade_plan.3')}</Text>
            </Text>
          </VStack>
        </ModalBody>
        {showControls && (
          <ModalFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} mr={3}>
              {t('insufficient_quota_dialog.cancel')}
            </Button>
            <Button variant="outline" onClick={onConfirm}>
              {t('insufficient_quota_dialog.confirm')}
            </Button>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
}
