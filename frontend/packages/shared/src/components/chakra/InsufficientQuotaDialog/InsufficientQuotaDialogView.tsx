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
  Flex,
  Text,
  VStack,
  HStack,
  Divider,
  Box
} from '@chakra-ui/react';
import { WarningIcon } from '@chakra-ui/icons';
import type { ExceededWorkspaceQuotaItem, WorkspaceQuotaItemType } from '../../../types/workspace';
import { resourcePropertyMap } from '../../../constants/resource';
import { getQuotaDialogI18n, type SupportedLang } from '../../../i18n/quota-dialog';

export interface InsufficientQuotaDialogViewProps {
  items: ExceededWorkspaceQuotaItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onOpenCostCenter: () => void;
  showControls: boolean;
  showRequirements: WorkspaceQuotaItemType[];
  lang: SupportedLang;
}

export function InsufficientQuotaDialogView({
  items,
  open,
  onOpenChange,
  onConfirm,
  showControls,
  onOpenCostCenter,
  showRequirements,
  lang
}: InsufficientQuotaDialogViewProps) {
  const i18n = getQuotaDialogI18n(lang);

  return (
    <Modal isOpen={open} onClose={() => onOpenChange(false)} isCentered>
      <ModalOverlay />
      <ModalContent maxW="800px">
        <ModalHeader>
          <Flex alignItems="center" gap={2}>
            <WarningIcon color="orange.500" />
            <Text>{i18n.title}</Text>
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Box bg="#FFF7ED" p={4} borderRadius="md">
              <Text>{i18n.alertTitle}</Text>

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
                          <props.icon size={20} />
                          <Text fontWeight="medium" textColor="gray.900">
                            {i18n.resourceLabels[item.type]}
                          </Text>
                        </Flex>
                        <HStack spacing={4} fontSize="md" justify={'center'} align={'center'}>
                          <Text>
                            {i18n.quotaTotal}
                            {(item.limit / props.scale).toFixed(2)} {props.unit}
                          </Text>
                          <Divider orientation="vertical" h={4} />
                          <Text>
                            {i18n.quotaInUse}
                            {(item.used / props.scale).toFixed(2)} {props.unit}
                          </Text>
                          <Divider orientation="vertical" h={4} />
                          <Text color={showRequirement ? undefined : 'red.500'}>
                            {i18n.quotaAvailable}
                            {((item.limit - item.used) / props.scale).toFixed(2)} {props.unit}
                          </Text>
                          {showRequirement && (
                            <>
                              <Divider orientation="vertical" h={4} />
                              <Text color="red.500">
                                {i18n.quotaRequired}
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
              <Text as="span">{i18n.pleaseUpgradePlan.prefix}</Text>
              <Text
                as="span"
                color="blue.600"
                textDecoration="underline"
                cursor="pointer"
                fontWeight="semibold"
                onClick={onOpenCostCenter}
              >
                {i18n.pleaseUpgradePlan.link}
              </Text>
              <Text as="span">{i18n.pleaseUpgradePlan.suffix}</Text>
            </Text>
          </VStack>
        </ModalBody>
        {showControls && (
          <ModalFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} mr={3}>
              {i18n.cancel}
            </Button>
            <Button variant="outline" onClick={onConfirm}>
              {i18n.confirm}
            </Button>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
}
