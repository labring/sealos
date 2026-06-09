import MyIcon from '@/components/Icon';
import MyFormControl from '@/components/FormControl';
import type { AppEditType, AppNetworkRouteType, NetworkRoutePathType } from '@/types/app';
import {
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useTheme
} from '@chakra-ui/react';
import { MySelect } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

const pathTypeList: Array<{ label: NetworkRoutePathType; value: NetworkRoutePathType }> = [
  { label: 'Prefix', value: 'Prefix' },
  { label: 'Exact', value: 'Exact' },
  { label: 'ImplementationSpecific', value: 'ImplementationSpecific' }
];
const routeRuleFieldWidthPx = 219.5;
const routeRuleFieldGapPx = 19;
const routeRuleFieldWidth = `${routeRuleFieldWidthPx}px`;
const routeRuleFieldGap = `${routeRuleFieldGapPx}px`;
const routeRuleContentWidth = `${routeRuleFieldWidthPx * 2 + routeRuleFieldGapPx}px`;
const routeRulesScrollbarWidth = '6px';

type RouteRulesForm = {
  routes: AppNetworkRouteType[];
};

type BackendServiceOption = {
  label: string;
  value: string;
  serviceName: string;
  servicePort: number;
};

const getBackendServiceValue = (serviceName = '', servicePort?: number) =>
  `${serviceName}:${servicePort || ''}`;

const parseBackendServiceValue = (
  value: string
): Pick<AppNetworkRouteType, 'serviceName' | 'servicePort'> => {
  const [serviceName, servicePort] = value.split(':');
  return {
    serviceName,
    servicePort: Number(servicePort) || undefined
  };
};

const createRoute = (port: number, serviceName = ''): AppNetworkRouteType => ({
  path: '/',
  pathType: 'Prefix',
  serviceName,
  servicePort: port
});

const normalizeRoutes = (
  routes: AppNetworkRouteType[] | undefined,
  port: number,
  serviceName = ''
) => {
  if (!routes?.length) {
    return [createRoute(port, serviceName)];
  }

  return routes.map((route) => ({
    path: route.path || '/',
    pathType: route.pathType || 'Prefix',
    serviceName: route.serviceName || serviceName,
    servicePort: route.servicePort || port
  }));
};

export default function RouteRulesModal({
  network,
  serviceOptions,
  onClose,
  onSave
}: {
  network: AppEditType['networks'][number];
  serviceOptions: BackendServiceOption[];
  onClose: () => void;
  onSave: (routes: AppNetworkRouteType[]) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  const backendServiceOptions = useMemo(() => {
    const options = serviceOptions.length ? serviceOptions : [];

    if (
      network.serviceName &&
      !options.some(
        (option) =>
          option.serviceName === network.serviceName && option.servicePort === network.port
      )
    ) {
      return [
        {
          label: `${network.serviceName}:${network.port}`,
          value: getBackendServiceValue(network.serviceName, network.port),
          serviceName: network.serviceName,
          servicePort: network.port
        },
        ...options
      ];
    }

    return options;
  }, [network.port, network.serviceName, serviceOptions]);

  const defaultServiceName = backendServiceOptions[0]?.serviceName || network.serviceName || '';
  const defaultServicePort = backendServiceOptions[0]?.servicePort || network.port;

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<RouteRulesForm>({
    defaultValues: {
      routes: normalizeRoutes(network.routes, defaultServicePort, defaultServiceName)
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'routes'
  });

  const routes = watch('routes');
  const shouldScroll = fields.length > 2;
  const getPathError = (index: number) => {
    const message = errors.routes?.[index]?.path?.message;
    return typeof message === 'string' ? message : undefined;
  };

  return (
    <Modal isOpen isCentered onClose={onClose} lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent
        maxW={'530px'}
        borderRadius={'10px'}
        overflow={'hidden'}
        boxShadow={'0px 32px 64px -12px rgba(19,51,107,0.2), 0px 0px 1px rgba(19,51,107,0.2)'}
      >
        <ModalHeader
          h={'48px'}
          px={'20px'}
          py={'12px'}
          bg={'grayModern.25'}
          borderBottom={'1px solid'}
          borderColor={'grayModern.100'}
          fontSize={'16px'}
          lineHeight={'24px'}
          fontWeight={500}
          color={'grayModern.900'}
        >
          {t('Configure Route Rules')}
        </ModalHeader>
        <ModalCloseButton top={'10px'} right={'20px'} w={'28px'} h={'28px'} />
        <ModalBody px={'36px'} py={'24px'}>
          <Flex direction={'column'} alignItems={'flex-end'} gap={'24px'}>
            <Box
              w={routeRuleContentWidth}
              maxH={shouldScroll ? '424px' : undefined}
              overflowY={shouldScroll ? 'auto' : 'visible'}
              overflowX={shouldScroll ? 'hidden' : 'visible'}
              pr={shouldScroll ? '14px' : 0}
              mr={shouldScroll ? '-14px' : 0}
              boxSizing={shouldScroll ? 'content-box' : 'border-box'}
              sx={
                shouldScroll
                  ? {
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'transparent transparent',
                      '&::-webkit-scrollbar': {
                        width: routeRulesScrollbarWidth
                      },
                      '&:hover': {
                        scrollbarColor: 'var(--chakra-colors-grayModern-300) transparent'
                      },
                      '&::-webkit-scrollbar-thumb': {
                        borderRadius: '999px',
                        bg: 'transparent'
                      },
                      '&:hover::-webkit-scrollbar-thumb': {
                        bg: 'grayModern.300'
                      },
                      '&::-webkit-scrollbar-track': {
                        bg: 'transparent'
                      }
                    }
                  : undefined
              }
            >
              {fields.map((field, index) => {
                const pathError = getPathError(index);

                return (
                  <Box
                    key={field.id}
                    role={'group'}
                    position={'relative'}
                    w={routeRuleContentWidth}
                    _notLast={{
                      pb: '24px',
                      mb: '24px',
                      borderBottom: theme.borders.base
                    }}
                  >
                    <Box
                      mb={'24px'}
                      fontSize={'14px'}
                      lineHeight={'20px'}
                      fontWeight={600}
                      color={'grayModern.900'}
                    >
                      {t('Route Rule Index', { index: String(index + 1).padStart(2, '0') })}
                    </Box>
                    {fields.length > 1 && (
                      <IconButton
                        aria-label={t('Delete')}
                        position={'absolute'}
                        top={'-6px'}
                        right={0}
                        w={'28px'}
                        minW={'28px'}
                        h={'28px'}
                        opacity={0}
                        pointerEvents={'none'}
                        transition={'opacity 0.15s ease'}
                        _groupHover={{ opacity: 1, pointerEvents: 'auto' }}
                        variant={'ghost'}
                        size={'sm'}
                        icon={<MyIcon name={'delete'} w={'16px'} fill={'#485264'} />}
                        onClick={() => remove(index)}
                      />
                    )}

                    <Flex gap={routeRuleFieldGap} mb={'24px'}>
                      <MyFormControl
                        showError={!!pathError}
                        errorText={pathError}
                        flex={`0 0 ${routeRuleFieldWidth}`}
                        w={routeRuleFieldWidth}
                        minW={0}
                      >
                        <Box
                          mb={'8px'}
                          fontSize={'14px'}
                          lineHeight={'20px'}
                          fontWeight={600}
                          color={'grayModern.900'}
                        >
                          {t('Path Route Path')}
                        </Box>
                        <Input
                          w={routeRuleFieldWidth}
                          h={'32px'}
                          bg={'grayModern.50'}
                          borderColor={'grayModern.200'}
                          fontSize={'12px'}
                          {...register(`routes.${index}.path`, {
                            required: t('Path Route Path Required') || 'Path is required',
                            validate: (value) =>
                              String(value || '').startsWith('/')
                                ? true
                                : t('Path Route Path Must Start With Slash')
                          })}
                        />
                      </MyFormControl>

                      <Box flex={`0 0 ${routeRuleFieldWidth}`} w={routeRuleFieldWidth} minW={0}>
                        <Box
                          mb={'8px'}
                          fontSize={'14px'}
                          lineHeight={'20px'}
                          fontWeight={600}
                          color={'grayModern.900'}
                        >
                          {t('Path Route Match Type')}
                        </Box>
                        <MySelect
                          width={routeRuleFieldWidth}
                          height={'32px'}
                          value={routes?.[index]?.pathType || 'Prefix'}
                          list={pathTypeList}
                          onchange={(val: string) => {
                            setValue(`routes.${index}.pathType`, val as NetworkRoutePathType, {
                              shouldDirty: true,
                              shouldValidate: true
                            });
                          }}
                        />
                      </Box>
                    </Flex>

                    <Box w={routeRuleContentWidth}>
                      <Box
                        mb={'8px'}
                        fontSize={'14px'}
                        lineHeight={'20px'}
                        fontWeight={600}
                        color={'grayModern.900'}
                      >
                        {t('Path Route Backend Service')}
                      </Box>
                      <MySelect
                        width={routeRuleContentWidth}
                        height={'32px'}
                        value={getBackendServiceValue(
                          routes?.[index]?.serviceName ?? defaultServiceName,
                          routes?.[index]?.servicePort || defaultServicePort
                        )}
                        list={backendServiceOptions}
                        onchange={(val: string) => {
                          const backendService = parseBackendServiceValue(val);
                          setValue(`routes.${index}.serviceName`, backendService.serviceName, {
                            shouldDirty: true,
                            shouldValidate: true
                          });
                          if (backendService.servicePort) {
                            setValue(`routes.${index}.servicePort`, backendService.servicePort, {
                              shouldDirty: true,
                              shouldValidate: true
                            });
                          }
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Box>

            <Button
              variant={'outline'}
              h={'36px'}
              w={'109px'}
              leftIcon={<MyIcon name="plus" w={'18px'} fill={'#485264'} />}
              onClick={() => append(createRoute(defaultServicePort, defaultServiceName))}
            >
              {t('Add Route Rule')}
            </Button>

            <Flex gap={'15px'}>
              <Button variant={'outline'} h={'36px'} w={'88px'} onClick={onClose}>
                {t('Cancel')}
              </Button>
              <Button
                h={'36px'}
                w={'88px'}
                bg={'grayModern.900'}
                color={'white'}
                _hover={{ bg: 'grayModern.700' }}
                onClick={handleSubmit((data) => {
                  onSave(
                    data.routes.map((route) => ({
                      path: route.path,
                      pathType: route.pathType,
                      serviceName: route.serviceName || defaultServiceName,
                      servicePort: route.servicePort || defaultServicePort
                    }))
                  );
                })}
              >
                {t('Save')}
              </Button>
            </Flex>
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
