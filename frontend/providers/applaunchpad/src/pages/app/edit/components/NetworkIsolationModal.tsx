import MyIcon from '@/components/Icon';
import {
  MAX_CIDRS_PER_RULE,
  MAX_NETWORK_ISOLATION_RULES,
  createDefaultNetworkIsolationConfig,
  type ApplicationAllowRule,
  type CidrAllowRule,
  type NetworkIsolationConfig,
  type NetworkIsolationRule
} from '@/types/networkIsolation';
import {
  confirmPublicCidrs,
  normalizeCidr,
  normalizeNetworkIsolationConfig,
  validateNetworkIsolationConfig,
  type NetworkIsolationValidation
} from '@/utils/network-isolation';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Badge,
  Box,
  Button,
  Center,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
  Switch,
  Text,
  Tooltip
} from '@chakra-ui/react';
import { nanoid } from 'nanoid';
import { useTranslation } from 'next-i18next';
import { useEffect, useRef, useState } from 'react';

interface NetworkIsolationModalProps {
  isOpen: boolean;
  value?: NetworkIsolationConfig;
  isLoading: boolean;
  isSaving: boolean;
  saveError?: string;
  onClose: () => void;
  onSave: (config: NetworkIsolationConfig) => Promise<boolean>;
}

const getRuleId = (type: NetworkIsolationRule['type']) => `${type}-${nanoid(10)}`;

const cloneConfig = (config: NetworkIsolationConfig): NetworkIsolationConfig => ({
  enabled: config.enabled,
  rules: config.rules.map((rule) =>
    rule.type === 'application' ? { ...rule } : { ...rule, cidrs: [...rule.cidrs] }
  )
});

const createApplicationRule = (id = getRuleId('application')): ApplicationAllowRule => ({
  id,
  type: 'application',
  sourceWorkspaceId: '',
  sourceApplicationId: ''
});

const createCidrRule = (id = getRuleId('cidr')): CidrAllowRule => ({
  id,
  type: 'cidr',
  cidrs: []
});

const getRuleTypeValue = (rule: NetworkIsolationRule) => rule.type;

export default function NetworkIsolationModal({
  isOpen,
  value,
  isLoading,
  isSaving,
  saveError,
  onClose,
  onSave
}: NetworkIsolationModalProps) {
  const { t } = useTranslation();
  const cancelPublicCidrRef = useRef<HTMLButtonElement>(null);
  const cancelDisableRef = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState<NetworkIsolationConfig>(createDefaultNetworkIsolationConfig);
  const [validation, setValidation] = useState<NetworkIsolationValidation>();
  const [cidrDrafts, setCidrDrafts] = useState<Record<string, string>>({});
  const [cidrInputErrors, setCidrInputErrors] = useState<Record<string, string>>({});
  const [isPublicCidrConfirmOpen, setIsPublicCidrConfirmOpen] = useState(false);
  const [isDisableConfirmOpen, setIsDisableConfirmOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || !value) return;
    setDraft(cloneConfig(value));
    setValidation(undefined);
    setCidrDrafts({});
    setCidrInputErrors({});
    setIsPublicCidrConfirmOpen(false);
    setIsDisableConfirmOpen(false);
  }, [isOpen, value]);

  const updateDraft = (updater: (config: NetworkIsolationConfig) => NetworkIsolationConfig) => {
    setValidation(undefined);
    setDraft(updater);
  };

  const updateRule = (
    ruleId: string,
    updater: (rule: NetworkIsolationRule) => NetworkIsolationRule
  ) => {
    updateDraft((config) => ({
      ...config,
      rules: config.rules.map((rule) => (rule.id === ruleId ? updater(rule) : rule))
    }));
  };

  const addCidrs = (ruleId: string, rawValue: string) => {
    const candidates = rawValue.split(/[\s,]+/).filter(Boolean);
    if (!candidates.length) return;

    const normalized = candidates.map(normalizeCidr);
    if (normalized.some((cidr) => !cidr.valid)) {
      setCidrInputErrors((errors) => ({
        ...errors,
        [ruleId]: t('network_isolation_cidr_invalid')
      }));
      return;
    }

    const rule = draft.rules.find((item) => item.id === ruleId);
    if (!rule || rule.type !== 'cidr') return;
    const cidrs = Array.from(
      new Set([...rule.cidrs, ...normalized.map((item) => item.value)])
    ).sort((left, right) => left.localeCompare(right));

    if (cidrs.length > MAX_CIDRS_PER_RULE) {
      setCidrInputErrors((errors) => ({
        ...errors,
        [ruleId]: t('network_isolation_cidr_limit', { count: MAX_CIDRS_PER_RULE })
      }));
      return;
    }

    setCidrInputErrors((errors) => {
      const { [ruleId]: _removed, ...rest } = errors;
      return rest;
    });
    setCidrDrafts((values) => ({ ...values, [ruleId]: '' }));
    updateRule(ruleId, (current) => (current.type === 'cidr' ? { ...current, cidrs } : current));
  };

  const removeRule = (ruleId: string) => {
    updateDraft((config) => ({
      ...config,
      rules: config.rules.filter((rule) => rule.id !== ruleId)
    }));
  };

  const persist = async (config: NetworkIsolationConfig) => {
    const didSave = await onSave(normalizeNetworkIsolationConfig(config));
    if (didSave) onClose();
  };

  const continueSave = (config: NetworkIsolationConfig) => {
    if (value?.enabled && !config.enabled) {
      setIsDisableConfirmOpen(true);
      return;
    }
    void persist(config);
  };

  const saveDraft = () => {
    const nextValidation = validateNetworkIsolationConfig(draft);
    setValidation(nextValidation);
    if (!nextValidation.valid) return;
    if (nextValidation.requiresPublicConfirmation) {
      setIsPublicCidrConfirmOpen(true);
      return;
    }
    continueSave(draft);
  };

  const isAtRuleLimit = draft.rules.length >= MAX_NETWORK_ISOLATION_RULES;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} isCentered lockFocusAcrossFrames={false}>
        <ModalOverlay />
        <ModalContent
          w={'calc(100vw - 32px)'}
          maxW={'532px'}
          h={draft.enabled ? 'calc(100vh - 48px)' : undefined}
          maxH={'calc(100vh - 48px)'}
          mx={4}
          borderRadius={'md'}
          display={'flex'}
          flexDirection={'column'}
          overflow={'hidden'}
        >
          <ModalHeader
            flexShrink={0}
            px={5}
            py={4}
            color={'grayModern.900'}
            fontSize={'16px'}
            lineHeight={'24px'}
          >
            {t('network_isolation_configure')}
          </ModalHeader>
          <ModalCloseButton top={3} right={3} aria-label={t('Close')} />
          <ModalBody display={'flex'} minH={0} flex={'1 1 auto'} p={0}>
            {isLoading || !value ? (
              <Center minH={'224px'} flex={'1 1 auto'}>
                <Spinner color={'brightBlue.600'} />
                <Text ml={3} color={'grayModern.600'} fontSize={'13px'}>
                  {t('network_isolation_loading')}
                </Text>
              </Center>
            ) : (
              <Flex w={'100%'} minH={0} flexDirection={'column'} overflow={'hidden'} px={9} pb={5}>
                <Flex
                  flexShrink={0}
                  alignItems={'flex-start'}
                  justifyContent={'space-between'}
                  gap={4}
                  py={1}
                >
                  <Box pr={2}>
                    <Text
                      color={'grayModern.900'}
                      fontSize={'13px'}
                      fontWeight={600}
                      lineHeight={'20px'}
                    >
                      {t('network_isolation_strict_mode')}
                    </Text>
                    <Text mt={1} color={'grayModern.600'} fontSize={'12px'} lineHeight={'18px'}>
                      {t('network_isolation_strict_mode_description')}
                    </Text>
                  </Box>
                  <Switch
                    flexShrink={0}
                    size={'lg'}
                    isChecked={draft.enabled}
                    onChange={(event) =>
                      updateDraft((config) => ({ ...config, enabled: event.target.checked }))
                    }
                    sx={{
                      '.chakra-switch__track': { bg: 'grayModern.200' },
                      '.chakra-switch__input:checked + .chakra-switch__track': {
                        bg: 'grayModern.900'
                      }
                    }}
                  />
                </Flex>

                {saveError && (
                  <Box
                    mt={4}
                    borderLeft={'3px solid'}
                    borderColor={'red.500'}
                    bg={'red.50'}
                    px={3}
                    py={2}
                  >
                    <Text color={'red.700'} fontSize={'12px'} lineHeight={'18px'}>
                      {saveError}
                    </Text>
                  </Box>
                )}

                {draft.enabled && (
                  <Box
                    data-testid={'network-isolation-rules'}
                    mt={5}
                    minH={0}
                    maxH={'348px'}
                    flexShrink={1}
                    overflowY={'auto'}
                    pr={2}
                    mr={-2}
                  >
                    <Box>
                      {draft.rules.map((rule, index) => {
                        const applicationError =
                          rule.type === 'application'
                            ? validation?.applicationRuleErrors[rule.id]
                            : undefined;
                        const cidrError =
                          rule.type === 'cidr' ? validation?.cidrRuleErrors[rule.id] : undefined;
                        const inputError =
                          rule.type === 'cidr' ? cidrInputErrors[rule.id] : undefined;

                        return (
                          <Box
                            key={rule.id}
                            pb={2}
                            mb={2}
                            borderBottom={'1px solid'}
                            borderColor={'grayModern.150'}
                          >
                            <Flex alignItems={'center'} justifyContent={'space-between'} mb={3}>
                              <Text
                                color={'grayModern.900'}
                                fontSize={'13px'}
                                fontWeight={600}
                                lineHeight={'20px'}
                              >
                                {t('network_isolation_rule_number', {
                                  number: String(index + 1).padStart(2, '0')
                                })}
                              </Text>
                              <Tooltip label={t('Delete')}>
                                <IconButton
                                  type={'button'}
                                  aria-label={t('Delete')}
                                  minW={'28px'}
                                  h={'28px'}
                                  variant={'ghost'}
                                  color={'grayModern.600'}
                                  icon={<MyIcon name={'delete'} w={'15px'} />}
                                  onClick={() => removeRule(rule.id)}
                                />
                              </Tooltip>
                            </Flex>

                            <Box ml={'24px'}>
                              <FormControl mb={rule.type === 'application' ? 3 : 0}>
                                <FormLabel
                                  mb={1}
                                  color={'grayModern.800'}
                                  fontSize={'12px'}
                                  fontWeight={500}
                                  lineHeight={'18px'}
                                >
                                  {t('network_isolation_rule_type')}
                                </FormLabel>
                                <Select
                                  h={'32px'}
                                  bg={'grayModern.50'}
                                  borderColor={'grayModern.200'}
                                  fontSize={'12px'}
                                  value={getRuleTypeValue(rule)}
                                  onChange={(event) => {
                                    const type = event.target.value as NetworkIsolationRule['type'];
                                    updateRule(rule.id, () =>
                                      type === 'application'
                                        ? createApplicationRule(rule.id)
                                        : createCidrRule(rule.id)
                                    );
                                  }}
                                >
                                  <option value={'application'}>
                                    {t('network_isolation_rule_type_application')}
                                  </option>
                                  <option value={'cidr'}>
                                    {t('network_isolation_rule_type_cidr')}
                                  </option>
                                </Select>
                              </FormControl>

                              {rule.type === 'application' ? (
                                <>
                                  <Flex
                                    mb={3}
                                    alignItems={'flex-start'}
                                    gap={'4px'}
                                    borderRadius={'6px'}
                                    bg={'brightBlue.50'}
                                    px={'12px'}
                                    py={'6px'}
                                    color={'brightBlue.600'}
                                  >
                                    <InfoOutlineIcon
                                      mt={'2px'}
                                      w={'12px'}
                                      h={'12px'}
                                      flexShrink={0}
                                    />
                                    <Text fontSize={'11px'} lineHeight={'16px'}>
                                      {t('network_isolation_application_info')}
                                    </Text>
                                  </Flex>
                                  <FormControl isInvalid={!!applicationError} mb={3}>
                                    <FormLabel
                                      mb={1}
                                      color={'grayModern.800'}
                                      fontSize={'12px'}
                                      fontWeight={500}
                                      lineHeight={'18px'}
                                    >
                                      {t('network_isolation_source_workspace_id')}
                                    </FormLabel>
                                    <Input
                                      h={'32px'}
                                      bg={'grayModern.50'}
                                      borderColor={'grayModern.200'}
                                      fontSize={'12px'}
                                      placeholder={t('network_isolation_workspace_placeholder')}
                                      value={rule.sourceWorkspaceId}
                                      onChange={(event) =>
                                        updateRule(rule.id, (current) =>
                                          current.type === 'application'
                                            ? { ...current, sourceWorkspaceId: event.target.value }
                                            : current
                                        )
                                      }
                                    />
                                  </FormControl>
                                  <FormControl isInvalid={!!applicationError}>
                                    <FormLabel
                                      mb={1}
                                      color={'grayModern.800'}
                                      fontSize={'12px'}
                                      fontWeight={500}
                                      lineHeight={'18px'}
                                    >
                                      {t('network_isolation_source_application_id')}
                                    </FormLabel>
                                    <Input
                                      h={'32px'}
                                      bg={'grayModern.50'}
                                      borderColor={'grayModern.200'}
                                      fontSize={'12px'}
                                      placeholder={t('network_isolation_application_placeholder')}
                                      value={rule.sourceApplicationId}
                                      onChange={(event) =>
                                        updateRule(rule.id, (current) =>
                                          current.type === 'application'
                                            ? {
                                                ...current,
                                                sourceApplicationId: event.target.value
                                              }
                                            : current
                                        )
                                      }
                                    />
                                    {applicationError && (
                                      <FormErrorMessage fontSize={'12px'}>
                                        {t(
                                          applicationError === 'duplicate'
                                            ? 'network_isolation_application_duplicate'
                                            : 'network_isolation_application_required'
                                        )}
                                      </FormErrorMessage>
                                    )}
                                  </FormControl>
                                </>
                              ) : (
                                <FormControl isInvalid={!!cidrError || !!inputError}>
                                  <FormLabel
                                    mb={1}
                                    color={'grayModern.800'}
                                    fontSize={'12px'}
                                    fontWeight={500}
                                    lineHeight={'18px'}
                                  >
                                    {t('network_isolation_cidr_input_label')}
                                  </FormLabel>
                                  <Input
                                    h={'32px'}
                                    bg={'grayModern.50'}
                                    borderColor={'grayModern.200'}
                                    fontSize={'12px'}
                                    placeholder={t('network_isolation_cidr_placeholder')}
                                    value={cidrDrafts[rule.id] || ''}
                                    onChange={(event) =>
                                      setCidrDrafts((values) => ({
                                        ...values,
                                        [rule.id]: event.target.value
                                      }))
                                    }
                                    onKeyDown={(event) => {
                                      if (
                                        event.key === 'Enter' ||
                                        event.key === ',' ||
                                        event.key === ' '
                                      ) {
                                        event.preventDefault();
                                        addCidrs(rule.id, cidrDrafts[rule.id] || '');
                                      }
                                    }}
                                    onBlur={() => addCidrs(rule.id, cidrDrafts[rule.id] || '')}
                                  />
                                  <Text
                                    mt={1}
                                    color={'grayModern.500'}
                                    fontSize={'11px'}
                                    lineHeight={'16px'}
                                  >
                                    {t('network_isolation_cidr_help')}
                                  </Text>
                                  {(inputError || cidrError) && (
                                    <FormErrorMessage fontSize={'12px'}>
                                      {inputError ||
                                        t(
                                          cidrError === 'tooMany'
                                            ? 'network_isolation_cidr_limit'
                                            : cidrError === 'invalid'
                                              ? 'network_isolation_cidr_invalid'
                                              : 'network_isolation_cidr_required',
                                          { count: MAX_CIDRS_PER_RULE }
                                        )}
                                    </FormErrorMessage>
                                  )}
                                  {rule.cidrs.length > 0 && (
                                    <Flex mt={2} flexWrap={'wrap'} gap={1.5}>
                                      {rule.cidrs.map((cidr) => (
                                        <Badge
                                          key={cidr}
                                          display={'inline-flex'}
                                          alignItems={'center'}
                                          gap={1}
                                          borderRadius={'sm'}
                                          bg={'grayModern.100'}
                                          color={'grayModern.700'}
                                          fontSize={'11px'}
                                          fontWeight={400}
                                          px={2}
                                          py={1}
                                        >
                                          {cidr}
                                          <IconButton
                                            type={'button'}
                                            aria-label={t('Delete')}
                                            minW={'14px'}
                                            h={'14px'}
                                            variant={'unstyled'}
                                            icon={<MyIcon name={'delete'} w={'10px'} />}
                                            onClick={() =>
                                              updateRule(rule.id, (current) =>
                                                current.type === 'cidr'
                                                  ? {
                                                      ...current,
                                                      cidrs: current.cidrs.filter(
                                                        (value) => value !== cidr
                                                      )
                                                    }
                                                  : current
                                              )
                                            }
                                          />
                                        </Badge>
                                      ))}
                                    </Flex>
                                  )}
                                </FormControl>
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>

                    {validation?.exceedsRuleLimit && (
                      <Text mt={-2} color={'red.600'} fontSize={'12px'}>
                        {t('network_isolation_rule_limit', { count: MAX_NETWORK_ISOLATION_RULES })}
                      </Text>
                    )}

                    <Button
                      type={'button'}
                      mt={draft.rules.length ? 0 : 5}
                      h={'32px'}
                      variant={'outline'}
                      color={'grayModern.700'}
                      borderColor={'grayModern.250'}
                      fontSize={'12px'}
                      leftIcon={<MyIcon name={'plus'} w={'15px'} />}
                      isDisabled={isAtRuleLimit}
                      onClick={() =>
                        updateDraft((config) => ({
                          ...config,
                          rules: [...config.rules, createApplicationRule()]
                        }))
                      }
                    >
                      {t('network_isolation_add_rule')}
                    </Button>
                  </Box>
                )}
              </Flex>
            )}
          </ModalBody>
          <ModalFooter
            flexShrink={0}
            px={5}
            py={3}
            borderTop={'1px solid'}
            borderColor={'grayModern.150'}
          >
            <Button h={'32px'} variant={'outline'} mr={3} onClick={onClose} isDisabled={isSaving}>
              {t('Cancel')}
            </Button>
            <Button
              h={'32px'}
              bg={'grayModern.900'}
              color={'white'}
              _hover={{ bg: 'grayModern.800' }}
              isLoading={isSaving}
              isDisabled={isLoading || !value}
              onClick={saveDraft}
            >
              {t('Save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={isPublicCidrConfirmOpen}
        leastDestructiveRef={cancelPublicCidrRef}
        onClose={() => setIsPublicCidrConfirmOpen(false)}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader fontSize={'18px'}>
              {t('network_isolation_public_confirm_title')}
            </AlertDialogHeader>
            <AlertDialogBody color={'grayModern.700'} fontSize={'14px'} lineHeight={'22px'}>
              {t('network_isolation_public_confirm_description')}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={cancelPublicCidrRef}
                variant={'outline'}
                onClick={() => setIsPublicCidrConfirmOpen(false)}
              >
                {t('Cancel')}
              </Button>
              <Button
                ml={3}
                colorScheme={'red'}
                onClick={() => {
                  setIsPublicCidrConfirmOpen(false);
                  continueSave(confirmPublicCidrs(draft));
                }}
              >
                {t('network_isolation_public_confirm_action')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <AlertDialog
        isOpen={isDisableConfirmOpen}
        leastDestructiveRef={cancelDisableRef}
        onClose={() => setIsDisableConfirmOpen(false)}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader fontSize={'18px'}>
              {t('network_isolation_disable_confirm_title')}
            </AlertDialogHeader>
            <AlertDialogBody color={'grayModern.700'} fontSize={'14px'} lineHeight={'22px'}>
              {t('network_isolation_disable_confirm_description')}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={cancelDisableRef}
                variant={'outline'}
                onClick={() => setIsDisableConfirmOpen(false)}
              >
                {t('Cancel')}
              </Button>
              <Button
                ml={3}
                colorScheme={'red'}
                onClick={() => {
                  setIsDisableConfirmOpen(false);
                  void persist(draft);
                }}
              >
                {t('network_isolation_disable_confirm_action')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
