import { obj2Query } from '@/api/tools';
import MyIcon from '@/components/Icon';
import { defaultSliderKey, defaultGpuSliderKey } from '@/constants/app';
import { GpuAmountMarkList } from '@/constants/editApp';
import { useGlobalStore } from '@/store/global';
import { PVC_STORAGE_MAX } from '@/store/static';
import { useUserStore } from '@/store/user';
import type { QueryType } from '@/types';
import { type AppEditType } from '@/types/app';
import { sliderNumber2MarkList } from '@/utils/adapt';
import { resourcePropertyMap, useUserQuota, type WorkspaceQuotaItem } from '@sealos/shared';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { Trash2, Plus, Minus } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@sealos/shadcn-ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@sealos/shadcn-ui/card';
import { Input } from '@sealos/shadcn-ui/input';
import { Label } from '@sealos/shadcn-ui/label';
import { Separator } from '@sealos/shadcn-ui/separator';
import { RadioGroup, RadioGroupItem } from '@sealos/shadcn-ui/radio-group';
import { Slider } from '@sealos/shadcn-ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@sealos/shadcn-ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@sealos/shadcn-ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@sealos/shadcn-ui/table';
import { Button } from '@sealos/shadcn-ui/button';
import { toast } from 'sonner';
import { throttle } from 'lodash';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFieldArray, UseFormReturn } from 'react-hook-form';
import type { ConfigMapType } from './ConfigmapModal';
import PriceBox from './PriceBox';
import QuotaBox from './QuotaBox';
import type { StoreType } from './StoreModal';
import { NetworkSection } from './NetworkSection';
import { mountPathToConfigMapKey } from '@/utils/tools';

const ConfigmapModal = dynamic(() => import('./ConfigmapModal'));
const StoreModal = dynamic(() => import('./StoreModal'));
const EditEnvs = dynamic(() => import('./EditEnvs'));

const Form = ({
  formHook,
  already,
  existingStores,
  countGpuInventory,
  refresh,
  onDomainVerified,
  exceededQuotas
}: {
  formHook: UseFormReturn<AppEditType, any>;
  already: boolean;
  existingStores: AppEditType['storeList'];
  countGpuInventory: (type?: string) => number;
  refresh: boolean;
  onDomainVerified?: (params: { index: number; customDomain: string }) => void;
  exceededQuotas: WorkspaceQuotaItem[];
}) => {
  if (!formHook) return null;
  const { t } = useTranslation();
  const { formSliderListConfig } = useGlobalStore();
  const { userSourcePrice } = useUserStore();
  const router = useRouter();
  const { name } = router.query as QueryType;
  const isEdit = useMemo(() => !!name, [name]);

  const {
    register,
    control,
    setValue,
    getValues,
    formState: { errors }
  } = formHook;

  const { fields: envs, replace: replaceEnvs } = useFieldArray({
    control,
    name: 'envs'
  });
  const {
    fields: configMaps,
    append: appendConfigMaps,
    remove: removeConfigMaps
  } = useFieldArray({
    control,
    name: 'configMapList'
  });
  const {
    fields: storeList,
    append: appendStoreList,
    remove: removeStoreList
  } = useFieldArray({
    control,
    name: 'storeList'
  });

  const navList = useMemo(
    () => [
      {
        id: 'baseInfo',
        label: 'Basic Config',
        icon: 'formInfo',
        isSetting:
          getValues('appName') &&
          getValues('imageName') &&
          (getValues('secret.use')
            ? getValues('secret.username') &&
              getValues('secret.password') &&
              getValues('secret.serverAddress')
            : true)
      },
      {
        id: 'network',
        label: 'Network Configuration',
        icon: 'network',
        isSetting: getValues('networks').length > 0
      },
      {
        id: 'settings',
        label: 'Advanced Configuration',
        icon: 'settings',
        isSetting:
          getValues('runCMD') ||
          getValues('cmdParam') ||
          getValues('envs').length > 0 ||
          getValues('configMapList').length > 0 ||
          getValues('storeList').length > 0
      }
    ],
    [getValues]
  );

  const [activeNav, setActiveNav] = useState(navList[0].id);
  const [configEdit, setConfigEdit] = useState<ConfigMapType>();
  const [storeEdit, setStoreEdit] = useState<StoreType>();
  const [isEditEnvs, setIsEditEnvs] = useState(false);
  const onOpenEditEnvs = () => setIsEditEnvs(true);
  const onCloseEditEnvs = () => setIsEditEnvs(false);

  // For quota calculation in fields
  const { userQuota } = useUserQuota();

  const storageQuotaLeft = useMemo(() => {
    const storageQuota = userQuota?.find((item) => item.type === 'storage');
    if (!storageQuota) return 0;

    const newlyUsedStorage =
      storeList.reduce((sum, item) => sum + item.value, 0) -
      existingStores.reduce((sum, item) => sum + item.value, 0);

    return (
      (storageQuota.limit - storageQuota.used) / resourcePropertyMap.storage.scale -
      newlyUsedStorage
    );
  }, [userQuota, existingStores, storeList]);

  // listen scroll and set activeNav
  useEffect(() => {
    const scrollFn = throttle(() => {
      const doms = navList.map((item) => ({
        dom: document.getElementById(item.id),
        id: item.id
      }));

      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      for (let i = doms.length - 1; i >= 0; i--) {
        const offsetTop = doms[i].dom?.offsetTop || 0;
        if (scrollTop + 200 >= offsetTop) {
          setActiveNav(doms[i].id);
          break;
        }
      }
    }, 200);
    window.addEventListener('scroll', scrollFn);
    return () => {
      window.removeEventListener('scroll', scrollFn);
    };
    // eslint-disable-next-line
  }, []);

  // GPU select list for shadcn Select
  const gpuSelectList = useMemo(
    () =>
      userSourcePrice?.gpu
        ? [
            { label: t('No GPU'), value: '', alias: '', vm: 0, inventory: 0 },
            ...userSourcePrice.gpu.map((item) => ({
              label: item.alias,
              value: item.type,
              alias: item.alias,
              vm: Math.round(item.vm),
              inventory: countGpuInventory(item.type)
            }))
          ]
        : [],
    [countGpuInventory, t, userSourcePrice?.gpu]
  );
  const selectedGpu = useMemo(() => {
    const selected = userSourcePrice?.gpu?.find((item) => item.type === getValues('gpu.type'));
    if (!selected) return;
    return {
      ...selected,
      inventory: countGpuInventory(selected.type)
    };
  }, [userSourcePrice?.gpu, countGpuInventory, getValues]);

  // cpu, memory have different sliderValue
  const countSliderList = useCallback(() => {
    const gpuType = getValues('gpu.type');
    // Use GPU-specific config if exists, otherwise use default-gpu, finally fallback to default
    let key = defaultSliderKey;
    if (gpuType) {
      if (formSliderListConfig[gpuType]) {
        key = gpuType;
      } else if (formSliderListConfig[defaultGpuSliderKey]) {
        key = defaultGpuSliderKey;
      }
    }

    const cpu = getValues('cpu');
    const memory = getValues('memory');

    const cpuList = formSliderListConfig[key].cpu;
    const memoryList = formSliderListConfig[key].memory;

    const sortedCpuList = !!gpuType
      ? cpuList
      : cpu !== undefined
      ? [...new Set([...cpuList, cpu])].sort((a, b) => a - b)
      : cpuList;

    const sortedMemoryList = !!gpuType
      ? memoryList
      : memory !== undefined
      ? [...new Set([...memoryList, memory])].sort((a, b) => a - b)
      : memoryList;

    return {
      cpu: sliderNumber2MarkList({
        val: sortedCpuList,
        type: 'cpu',
        gpuAmount: getValues('gpu.amount')
      }),
      memory: sliderNumber2MarkList({
        val: sortedMemoryList,
        type: 'memory',
        gpuAmount: getValues('gpu.amount')
      })
    };
  }, [formSliderListConfig, getValues]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const SliderList = useMemo(() => countSliderList(), [already, refresh]);

  const persistentVolumes = useMemo(() => {
    return getValues('volumes')
      .filter((item) => 'persistentVolumeClaim' in item)
      .reduce(
        (
          acc: {
            path: string;
            name: string;
          }[],
          volume
        ) => {
          const mount = getValues('volumeMounts').find((m) => m.name === volume.name);
          if (mount) {
            acc.push({
              path: mount.mountPath,
              name: volume.name
            });
          }
          return acc;
        },
        []
      );
  }, [getValues]);

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
    <>
      <div
        className="grid gap-5 max-w-[1200px] w-full"
        style={{
          gridTemplateColumns: '266px 1fr'
        }}
      >
        {/* Left Sidebar */}
        <div className="flex flex-col gap-4">
          <Tabs defaultValue="form" className="w-full">
            <TabsList className="w-full h-auto bg-zinc-100 rounded-xl">
              <TabsTrigger
                value="form"
                className="flex-1 h-9 text-base rounded-lg font-medium shadow-sm"
              >
                {t('Config Form')}
              </TabsTrigger>
              <TabsTrigger
                value="yaml"
                className="flex-1 h-9 text-base font-normal"
                onClick={() =>
                  router.replace(
                    `/app/edit?${obj2Query({
                      name,
                      type: 'yaml'
                    })}`
                  )
                }
              >
                {t('YAML File')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white p-1">
            {navList.map((item) => {
              const IconComponent = item.icon === 'formInfo' ? FileText : item.icon === 'network' ? Globe : Settings;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    const element = document.getElementById(item.id);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className={`flex h-10 cursor-pointer items-center gap-2 rounded px-2 text-zinc-900 hover:bg-zinc-100 ${
                    activeNav === item.id ? 'bg-zinc-100' : 'bg-transparent'
                  }`}
                >
                  <div
                    className={`h-6 w-0.5 rounded-full bg-zinc-900 transition-opacity ${
                      activeNav === item.id ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <IconComponent
                    className={`h-5 w-5 ${activeNav === item.id ? 'text-zinc-900' : 'text-zinc-500'}`}
                  />
                  <span className="text-sm">{t(item.label)}</span>
                </div>
              );
            })}
          </div> */}

          {/* Price Box */}
          {userSourcePrice && (
            <div className="overflow-hidden">
              <PriceBox
                pods={
                  getValues('hpa.use')
                    ? [getValues('hpa.minReplicas') || 1, getValues('hpa.maxReplicas') || 2]
                    : [getValues('replicas') || 1, getValues('replicas') || 1]
                }
                cpu={getValues('cpu')}
                memory={getValues('memory')}
                storage={getValues('storeList').reduce((sum, item) => sum + item.value, 0)}
                gpu={
                  !!getValues('gpu.type')
                    ? {
                        type: getValues('gpu.type'),
                        amount: getValues('gpu.amount')
                      }
                    : undefined
                }
                nodeports={getValues('networks').filter((item) => item.openNodePort)?.length || 0}
              />
            </div>
          )}

          {/* Quota Box */}
          {userSourcePrice && (
            <div className="overflow-hidden">
              <QuotaBox />
            </div>
          )}
        </div>

        {/* Right Content */}
        <div id="form-container" className="relative w-full space-y-4">
          {/* Name Card */}
          <Card className="">
            <CardHeader className="pt-8 px-8 pb-5 bg-transparent gap-0">
              <CardTitle className="text-xl font-medium text-zinc-900">{t('App Name')}</CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="flex flex-col gap-2">
                <Input
                  aria-label={t('App Name')}
                  className={`max-w-[400px] h-10 placeholder:text-zinc-500 ${
                    errors.appName ? 'border-red-500' : ''
                  }`}
                  disabled={isEdit}
                  title={isEdit ? t('Not allowed to change app name') || '' : ''}
                  autoFocus={true}
                  maxLength={60}
                  placeholder={
                    t(
                      'Starts with a letter and can contain only lowercase letters, digits, and hyphens (-)'
                    ) || ''
                  }
                  {...register('appName', {
                    required: t('App Name is required') || '',
                    maxLength: 60,
                    pattern: {
                      value: /^[a-z]([-a-z0-9]*[a-z0-9])?$/,
                      message: 'invalid'
                    }
                  })}
                />
                {errors.appName && (
                  <div className="text-sm text-red-500">
                    {errors.appName.type === 'pattern' ? (
                      <>
                        <p>{t('Invalid name')}</p>
                        <ul className="list-disc list-inside ml-1 mt-1">
                          <li>{t('Use only lowercase letters, numbers, or hyphens (-)')}</li>
                          <li>{t('Must start/end with a letter or number')}</li>
                        </ul>
                      </>
                    ) : (
                      <p>{errors.appName.message}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Image Card */}
          <Card className="driver-deploy-image">
            <CardHeader className="pt-8 px-8 pb-5 bg-transparent gap-0">
              <CardTitle className="text-xl font-medium text-zinc-900">{t('Image')}</CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-3">
              {/* Public/Private Toggle */}
              <RadioGroup
                value={getValues('secret.use') ? 'private' : 'public'}
                onValueChange={(val) => setValue('secret.use', val === 'private')}
                className="flex gap-3 mb-4"
              >
                <label
                  className={`min-w-[150px] h-10 flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                    !getValues('secret.use')
                      ? 'border-zinc-900 bg-white'
                      : 'border-zinc-200 bg-white hover:bg-zinc-50'
                  }`}
                >
                  <RadioGroupItem value="public" />
                  <span className="text-sm font-medium">{t('Public')}</span>
                </label>
                <label
                  className={`min-w-[150px] h-10 flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                    getValues('secret.use')
                      ? 'border-zinc-900 bg-white'
                      : 'border-zinc-200 bg-white hover:bg-zinc-50'
                  }`}
                >
                  <RadioGroupItem value="private" />
                  <span className="text-sm font-medium">{t('Private')}</span>
                </label>
              </RadioGroup>

              {/* Image Name */}
              <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                <Label className="text-sm font-medium text-zinc-900 h-10 flex items-center">
                  {t('Image Name')}
                </Label>
                <div className="flex flex-col gap-1">
                  <Input
                    className={`max-w-[360px] h-10 placeholder:text-zinc-500 ${
                      errors.imageName ? 'border-red-500' : ''
                    }`}
                    placeholder={`${t('Image Name')}`}
                    {...register('imageName', {
                      required: t('Image name cannot be empty') || '',
                      setValueAs(e) {
                        return e.replace(/\s*/g, '');
                      }
                    })}
                  />
                  {errors.imageName && (
                    <p className="text-sm text-red-500">{errors.imageName.message}</p>
                  )}
                </div>
              </div>

              {getValues('secret.use') && (
                <>
                  <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                    <Label className="text-sm font-medium text-zinc-900 h-10 flex items-center">
                      {t('Username')}
                    </Label>
                    <div className="flex flex-col gap-1">
                      <Input
                        className={`max-w-[360px] h-10 placeholder:text-zinc-500 ${
                          errors.secret?.username ? 'border-red-500' : ''
                        }`}
                        placeholder={`${t('Username for the image registry')}`}
                        {...register('secret.username', {
                          required: t('The user name cannot be empty') || ''
                        })}
                      />
                      {errors.secret?.username && (
                        <p className="text-sm text-red-500">{errors.secret.username.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                    <Label className="text-sm font-medium text-zinc-900 h-10 flex items-center">
                      {t('Password')}
                    </Label>
                    <div className="flex flex-col gap-1">
                      <Input
                        type="password"
                        className={`max-w-[360px] h-10 placeholder:text-zinc-500 ${
                          errors.secret?.password ? 'border-red-500' : ''
                        }`}
                        placeholder={`${t('Password for the image registry')}`}
                        {...register('secret.password', {
                          required: t('The password cannot be empty') || ''
                        })}
                      />
                      {errors.secret?.password && (
                        <p className="text-sm text-red-500">{errors.secret.password.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                    <Label className="text-sm font-medium text-zinc-900 h-10 flex items-center">
                      {t('Image Address')}
                    </Label>
                    <div className="flex flex-col gap-1">
                      <Input
                        className={`max-w-[360px] h-10 placeholder:text-zinc-500 ${
                          errors.secret?.serverAddress ? 'border-red-500' : ''
                        }`}
                        placeholder={`${t('Image Address')}`}
                        {...register('secret.serverAddress', {
                          required: t('The image cannot be empty') || ''
                        })}
                      />
                      {errors.secret?.serverAddress && (
                        <p className="text-sm text-red-500">
                          {errors.secret.serverAddress.message}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Usage Card */}
          <Card className="driver-deploy-instance">
            <CardHeader className="pt-8 px-8 pb-5 bg-transparent gap-0">
              <CardTitle className="text-xl font-medium text-zinc-900">{t('Usage')}</CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-4">
              {/* Fixed/Scaling Toggle */}
              <RadioGroup
                value={getValues('hpa.use') ? 'hpa' : 'static'}
                onValueChange={(val) => setValue('hpa.use', val === 'hpa')}
                className="flex gap-3"
              >
                <label
                  className={`min-w-[150px] h-10 flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                    !getValues('hpa.use')
                      ? 'border-zinc-900 bg-white'
                      : 'border-zinc-200 bg-white hover:bg-zinc-50 '
                  }`}
                >
                  <RadioGroupItem value="static" />
                  <span className="text-sm font-medium">{t('Fixed instance')}</span>
                </label>
                <label
                  className={`min-w-[150px] h-10 flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                    getValues('hpa.use')
                      ? 'border-zinc-900 bg-white'
                      : 'border-zinc-200 bg-white hover:bg-zinc-50'
                  }`}
                >
                  <RadioGroupItem value="hpa" />
                  <span className="text-sm font-medium">{t('Auto scaling')}</span>
                </label>
              </RadioGroup>

              {getValues('hpa.use') ? (
                <>
                  {/* HPA Mode */}
                  <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                    <Label className="text-sm font-medium text-zinc-900">{t('Target')}</Label>
                    <div className="flex items-center gap-3">
                      <Select
                        value={getValues('hpa.target')}
                        onValueChange={(val) => setValue('hpa.target', val as 'cpu' | 'memory')}
                      >
                        <SelectTrigger className="min-w-[150px] h-10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cpu">{t('CPU')}</SelectItem>
                          <SelectItem value="memory">{t('Memory')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="relative w-[100px]">
                        <Input
                          type="number"
                          className={`h-10 pr-8 ${
                            getValues('hpa.target') === 'gpu' ? 'pr-0' : 'pr-8'
                          }`}
                          {...register('hpa.value', {
                            required: t('The Cpu target is empty') || '',
                            valueAsNumber: true,
                            min: {
                              value: 1,
                              message: t('The cpu target value must be positive')
                            },
                            max: {
                              value: 100,
                              message: t('The target cpu value must be less than 100')
                            }
                          })}
                        />
                        {getValues('hpa.target') !== 'gpu' && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500 pointer-events-none">
                            %
                          </span>
                        )}
                      </div>
                      <p className="ml-1 text-sm text-zinc-500">
                        {t('CPU target is the CPU utilization rate of any container')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                    <Label className="text-sm font-medium text-zinc-900">{t('Replicas')}</Label>
                    <div className="flex items-center gap-3">
                      {/* Min Replicas */}
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => {
                            const current = getValues('hpa.minReplicas') || 1;
                            if (current > 1) setValue('hpa.minReplicas', current - 1);
                          }}
                          disabled={(getValues('hpa.minReplicas') || 1) <= 1}
                          className="w-10 h-10 flex items-center justify-center border rounded-l-lg bg-white hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <div className="w-12 h-10 flex items-center justify-center border-t border-b border-zinc-200 bg-white text-sm font-medium">
                          {getValues('hpa.minReplicas') || 1}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const current = getValues('hpa.minReplicas') || 1;
                            const max = getValues('hpa.maxReplicas') || 2;
                            if (current < max) setValue('hpa.minReplicas', current + 1);
                          }}
                          disabled={
                            (getValues('hpa.minReplicas') || 1) >=
                            (getValues('hpa.maxReplicas') || 2)
                          }
                          className="w-10 h-10 flex items-center justify-center border rounded-r-lg bg-white hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                      <span className="text-zinc-500">~</span>
                      {/* Max Replicas */}
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => {
                            const current = getValues('hpa.maxReplicas') || 2;
                            const min = getValues('hpa.minReplicas') || 1;
                            if (current > min) setValue('hpa.maxReplicas', current - 1);
                          }}
                          disabled={
                            (getValues('hpa.maxReplicas') || 2) <=
                            (getValues('hpa.minReplicas') || 1)
                          }
                          className="w-10 h-10 flex items-center justify-center border rounded-l-lg bg-white hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <div className="w-12 h-10 flex items-center justify-center border-t border-b border-zinc-200 bg-white text-sm font-medium">
                          {getValues('hpa.maxReplicas') || 2}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const current = getValues('hpa.maxReplicas') || 2;
                            if (current < 20) setValue('hpa.maxReplicas', current + 1);
                          }}
                          disabled={(getValues('hpa.maxReplicas') || 2) >= 20}
                          className="w-10 h-10 flex items-center justify-center border rounded-r-lg bg-white hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Fixed Mode - Replicas with +/- buttons */
                <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                  <Label className="text-sm font-medium text-zinc-900">{t('Replicas')}</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center w-min">
                          <button
                            type="button"
                            onClick={() => {
                              const current = getValues('replicas') || 1;
                              if (current > 1) setValue('replicas', current - 1);
                            }}
                            disabled={(getValues('replicas') || 1) <= 1}
                            className="w-10 h-10 flex items-center justify-center border rounded-l-lg bg-white hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Minus className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <div className="w-20 h-10 flex items-center justify-center border-t border-b border-zinc-200 bg-white text-sm font-medium">
                            {getValues('replicas') || 1}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const current = getValues('replicas') || 1;
                              if (current < 20) setValue('replicas', current + 1);
                            }}
                            disabled={(getValues('replicas') || 1) >= 20}
                            className="w-10 h-10 flex items-center justify-center border rounded-r-lg bg-white hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="rounded-xl">
                        <p className="text-sm text-zinc-900 font-normal p-2">
                          {`${t('Replicas Range')}: 1~20`}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}

              {/* GPU (if available) */}
              {userSourcePrice?.gpu && (
                <>
                  <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                    <Label className="text-sm font-medium text-zinc-900">GPU</Label>
                    <Select
                      value={getValues('gpu.type') || 'none'}
                      onValueChange={(type) => {
                        const actualType = type === 'none' ? '' : type;
                        const selected = userSourcePrice?.gpu?.find(
                          (item) => item.type === actualType
                        );
                        const inventory = countGpuInventory(actualType);
                        if (actualType === '' || (selected && inventory > 0)) {
                          setValue('gpu.type', actualType);
                          const sliderList = countSliderList();
                          setValue('cpu', sliderList.cpu[1].value);
                          setValue('memory', sliderList.memory[1].value);
                        }
                      }}
                    >
                      <SelectTrigger className="w-[400px] h-10 rounded-lg pl-2">
                        <SelectValue placeholder={t('No GPU') || ''} />
                      </SelectTrigger>
                      <SelectContent>
                        {gpuSelectList.map((item) => (
                          <SelectItem key={item.value || 'none'} value={item.value || 'none'}>
                            {item.value === '' ? (
                              <span>{t('No GPU')}</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-[6px] rounded-md bg-zinc-100 px-2 py-1">
                                  {item.alias.toLowerCase().startsWith('nvidia') && (
                                    <MyIcon name="nvidiaGreen" w="16px" h="16px" color="#10B981" />
                                  )}
                                  <span className="text-zinc-900 font-medium">{item.alias}</span>
                                </div>
                                <span className="text-zinc-900">
                                  {t('vm')}: {item.vm}G
                                </span>
                                <span className="text-zinc-200">|</span>
                                <span className="text-zinc-900">
                                  {t('Inventory')}:{' '}
                                  <span className="text-yellow-600">{item.inventory}</span>
                                </span>
                              </div>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {!!getValues('gpu.type') && (
                      <>
                        <div></div>
                        <div className="flex flex-col gap-2">
                          <Label className="text-sm font-medium text-zinc-900">{t('Amount')}</Label>
                          <div className="flex items-center gap-2">
                            {GpuAmountMarkList.map((item) => {
                              const inventory = selectedGpu?.inventory || 0;
                              const hasInventory = item.value <= inventory;

                              return (
                                <TooltipProvider key={item.value}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        disabled={!hasInventory}
                                        onClick={() => {
                                          setValue('gpu.amount', item.value);
                                          const sliderList = countSliderList();
                                          setValue('cpu', sliderList.cpu[1].value);
                                          setValue('memory', sliderList.memory[1].value);
                                        }}
                                        className={`w-10 h-10 rounded-lg border text-sm font-normal transition-all ${
                                          getValues('gpu.amount') === item.value
                                            ? 'border-zinc-900 bg-white'
                                            : 'border-zinc-200 bg-white'
                                        } ${
                                          !hasInventory
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'cursor-pointer hover:bg-zinc-50'
                                        }`}
                                      >
                                        {item.label}
                                      </button>
                                    </TooltipTrigger>
                                    {!hasInventory && (
                                      <TooltipContent>
                                        <p>{t('Under Stock')}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })}
                            {/* <span className="ml-2 text-zinc-500">/ {t('Card')}</span> */}
                          </div>
                        </div>
                      </>
                    )}

                    {exceededQuotas.some(({ type }) => type === 'gpu') && (
                      <p className="ml-[112px] text-sm text-red-500 col-span-full">
                        {t('gpu_exceeds_quota', {
                          requested: getValues('gpu.amount') || 0,
                          limit: exceededQuotas.find(({ type }) => type === 'gpu')?.limit ?? 0,
                          used: exceededQuotas.find(({ type }) => type === 'gpu')?.used ?? 0
                        })}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* CPU */}
              <div className="grid grid-cols-[100px_1fr] items-start gap-3 pt-3">
                <Label className="text-sm font-medium text-zinc-900">{t('CPU')}</Label>
                <div className="flex-1 flex flex-col gap-3 px-1">
                  <Slider
                    value={[
                      SliderList.cpu.findIndex((item) => item.value === getValues('cpu')) ?? 0
                    ]}
                    onValueChange={([val]) => setValue('cpu', SliderList.cpu[val].value)}
                    max={SliderList.cpu.length - 1}
                    min={0}
                    step={1}
                  />
                  <div className="relative h-4 text-xs text-zinc-500 mx-2">
                    {SliderList.cpu.map((item, i) => (
                      <span
                        key={i}
                        onClick={() => setValue('cpu', item.value)}
                        className={`absolute w-10 text-center -translate-x-1/2 cursor-pointer hover:text-zinc-700 ${
                          getValues('cpu') === item.value ? 'text-zinc-900 font-medium' : ''
                        }`}
                        style={{
                          left:
                            i === 0
                              ? '1%'
                              : i === SliderList.cpu.length - 1
                              ? '99%'
                              : `${(i / (SliderList.cpu.length - 1)) * 100}%`
                        }}
                      >
                        {item.label}
                      </span>
                    ))}
                  </div>
                  {exceededQuotas.some(({ type }) => type === 'cpu') && (
                    <p className="text-sm text-red-500">
                      {t('cpu_exceeds_quota', {
                        requested: getValues('cpu') / resourcePropertyMap.cpu.scale,
                        limit:
                          (exceededQuotas.find(({ type }) => type === 'cpu')?.limit ?? 0) /
                          resourcePropertyMap.cpu.scale,
                        used:
                          (exceededQuotas.find(({ type }) => type === 'cpu')?.used ?? 0) /
                          resourcePropertyMap.cpu.scale
                      })}
                    </p>
                  )}
                </div>
              </div>

              {/* Memory */}
              <div className="grid grid-cols-[100px_1fr] items-start gap-3 pt-2">
                <Label className="text-sm font-medium text-zinc-900">{t('Memory')}</Label>
                <div className="flex-1 flex flex-col gap-3 px-1">
                  <Slider
                    value={[
                      SliderList.memory.findIndex((item) => item.value === getValues('memory')) ?? 0
                    ]}
                    onValueChange={([val]) => setValue('memory', SliderList.memory[val].value)}
                    max={SliderList.memory.length - 1}
                    min={0}
                    step={1}
                  />
                  <div className="relative h-4 text-xs text-zinc-500 mx-2">
                    {SliderList.memory.map((item, i) => (
                      <span
                        key={i}
                        onClick={() => setValue('memory', item.value)}
                        className={`absolute w-10 text-center -translate-x-1/2 cursor-pointer hover:text-zinc-700 ${
                          getValues('memory') === item.value ? 'text-zinc-900 font-medium' : ''
                        }`}
                        style={{
                          left:
                            i === 0
                              ? '1%'
                              : i === SliderList.memory.length - 1
                              ? '99%'
                              : `${(i / (SliderList.memory.length - 1)) * 100}%`
                        }}
                      >
                        {item.label}
                      </span>
                    ))}
                  </div>
                  {exceededQuotas.some(({ type }) => type === 'memory') && (
                    <p className="text-sm text-red-500">
                      {t('memory_exceeds_quota', {
                        requested: getValues('memory') / resourcePropertyMap.memory.scale,
                        limit:
                          (exceededQuotas.find(({ type }) => type === 'memory')?.limit ?? 0) /
                          resourcePropertyMap.memory.scale,
                        used:
                          (exceededQuotas.find(({ type }) => type === 'memory')?.used ?? 0) /
                          resourcePropertyMap.memory.scale
                      })}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* network */}
          <NetworkSection
            formHook={formHook}
            exceededQuotas={exceededQuotas}
            onDomainVerified={onDomainVerified}
            handleOpenCostcenter={handleOpenCostcenter}
          />

          {/* settings */}
          {already && (
            <Card id="settings" className="">
              <CardHeader className="pt-8 px-8 pb-6 bg-transparent gap-0">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl font-medium text-zinc-900">
                    {t('Advanced Configuration')}
                  </CardTitle>
                  <span className="px-3 py-1 text-xs font-medium text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-full">
                    {t('Option')}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                {/* Command Section */}
                <div>
                  <div className="flex flex-col gap-1 mb-3">
                    <h3 className="text-base font-medium leading-none text-zinc-900">
                      {t('Command')}
                    </h3>
                    <p className="text-sm font-normal text-zinc-500">
                      {t('If no, the default command is used')}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-[100px_1fr] items-center gap-3 driver-deploy-command">
                      <Label className="text-sm font-medium leading-none text-zinc-900">
                        {t('Command')}
                      </Label>
                      <Input
                        className="max-w-[400px] h-10"
                        placeholder={`${t('Such as')} /bin/bash -c`}
                        {...register('runCMD')}
                      />
                    </div>
                    <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                      <Label className="text-sm font-medium leading-none text-zinc-900">
                        {t('Arguments')}
                      </Label>
                      <Input
                        className="max-w-[400px] h-10"
                        placeholder={`${t('Such as')} sleep 10 && /entrypoint.sh db createdb`}
                        {...register('cmdParam')}
                      />
                    </div>
                  </div>
                </div>

                <Separator className="bg-transparent border-t border-dashed border-zinc-200 my-4" />

                {/* Environment Variables Section */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-medium leading-none text-zinc-900">
                      {t('Environment Variables')}
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 min-w-[86px] shadow-none hover:bg-zinc-50"
                      onClick={onOpenEditEnvs}
                    >
                      <Plus className="w-4 h-4" />
                      {t('Add')}
                    </Button>
                  </div>
                  {envs.length > 0 && (
                    <div className="border border-zinc-200 rounded-lg overflow-hidden">
                      <Table className="[&_th]:border-b [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-b [&_td]:border-r [&_td:last-child]:border-r-0 [&_tr:last-child_td]:border-b-0 [&_tbody_tr:nth-child(even)]:bg-zinc-50">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px] h-auto py-2 font-semibold text-zinc-500 bg-zinc-50">
                              {t('Key')}
                            </TableHead>
                            <TableHead className="h-auto py-2 font-semibold text-zinc-500 bg-zinc-50">
                              {t('Value')}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {envs.map((env) => {
                            const valText = env.value
                              ? env.value
                              : env.valueFrom
                              ? 'value from | ***'
                              : '';
                            return (
                              <TableRow key={env.id}>
                                <TableCell className="text-sm font-normal text-zinc-900">
                                  {env.key}
                                </TableCell>
                                <TableCell>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="text-sm text-zinc-900 font-normal truncate block cursor-default">
                                          {valText}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" className="rounded-xl">
                                        <p className="max-w-xs break-all">{valText}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <Separator className="bg-transparent border-t border-dashed border-zinc-200 my-4" />

                {/* Configmaps Section */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-medium text-zinc-900">{t('Configmaps')}</h3>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 min-w-[86px] shadow-none hover:bg-zinc-50"
                      onClick={() =>
                        setConfigEdit({ mountPath: '', value: '', key: '', volumeName: '' })
                      }
                    >
                      <Plus className="w-4 h-4" />
                      {t('Add')}
                    </Button>
                  </div>
                  {configMaps.length > 0 && (
                    <div className="space-y-1">
                      {configMaps.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg cursor-pointer hover:bg-zinc-100 transition-colors"
                          onClick={() => setConfigEdit(item)}
                        >
                          <MyIcon
                            name="configMapColor"
                            w="24px"
                            h="24px"
                            color="#a1a1aa"
                            className="shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900">{item.mountPath}</p>
                            <p className="text-xs text-neutral-500 truncate">{item.value}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-neutral-500 hover:text-red-600 hover:bg-transparent"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeConfigMaps(index);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator className="bg-transparent border-t border-dashed border-zinc-200 my-4" />

                {/* Local Storage Section */}
                <div className="driver-deploy-storage">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-base font-medium leading-none text-zinc-900">
                        {t('Local Storage')}
                      </h3>
                      <p className="text-sm font-normal text-zinc-500">
                        {t('Data cannot be communicated between multiple instances')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 min-w-[86px] shadow-none hover:bg-zinc-50"
                      onClick={() => setStoreEdit({ name: '', path: '', value: 1 })}
                    >
                      <Plus className="w-4 h-4" />
                      {t('Add')}
                    </Button>
                  </div>
                  {(storeList.length > 0 || persistentVolumes.length > 0) && (
                    <div className="space-y-1">
                      {storeList.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg cursor-pointer hover:bg-zinc-100 transition-colors"
                          onClick={() => setStoreEdit(item)}
                        >
                          <MyIcon
                            name="storeColor"
                            w="24px"
                            h="24px"
                            color="#a1a1aa"
                            className="shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900">{item.path}</p>
                            <p className="text-xs text-neutral-500">{item.value} Gi</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-neutral-500 hover:text-red-600 hover:bg-transparent"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (storeList.length === 1) {
                                toast.error(t('Store At Least One'));
                              } else {
                                removeStoreList(index);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {persistentVolumes.map((item) => (
                        <div
                          key={item.path}
                          className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg cursor-not-allowed opacity-70"
                        >
                          <MyIcon
                            name="storeColor"
                            w="24px"
                            h="24px"
                            color="#a1a1aa"
                            className="shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900">{item.path}</p>
                          </div>
                          <span className="text-xs text-neutral-500">{t('shared')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {isEditEnvs && (
        <EditEnvs defaultEnv={envs} onClose={onCloseEditEnvs} successCb={(e) => replaceEnvs(e)} />
      )}
      {configEdit && (
        <ConfigmapModal
          defaultValue={configEdit}
          listNames={configMaps
            .filter((item) => item.id !== configEdit.id)
            .map((item) => item.mountPath.toLocaleLowerCase())}
          successCb={(e) => {
            if (!e.id) {
              appendConfigMaps({
                ...e,
                key: mountPathToConfigMapKey(e.mountPath),
                volumeName: getValues('appName') + '-cm'
              });
            } else {
              setValue(
                'configMapList',
                configMaps.map((item) => {
                  return {
                    mountPath: item.id === e.id ? e.mountPath : item.mountPath,
                    value: item.id === e.id ? e.value : item.value,
                    key: item.id === e.id ? e.key : item.key,
                    volumeName: item.id === e.id ? e.volumeName : item.volumeName
                  };
                })
              );
            }
            setConfigEdit(undefined);
          }}
          closeCb={() => setConfigEdit(undefined)}
        />
      )}
      {storeEdit && (
        <StoreModal
          defaultValue={storeEdit}
          isEditStore={!!existingStores.find((item) => storeEdit.path === item.path)}
          minValue={existingStores.find((item) => storeEdit.path === item.path)?.value ?? 1}
          maxValue={Math.min(
            // left quota - this one
            storageQuotaLeft + (storeList.find((item) => item.id === storeEdit.id)?.value ?? 0),
            // But not exceed the size cap
            PVC_STORAGE_MAX
          )}
          listNames={storeList
            .filter((item) => item.id !== storeEdit.id)
            .map((item) => item.path.toLocaleLowerCase())}
          successCb={(e) => {
            if (!e.id) {
              appendStoreList(e);
            } else {
              setValue(
                'storeList',
                storeList.map((item) => ({
                  name: item.id === e.id ? e.name : item.name,
                  path: item.id === e.id ? e.path : item.path,
                  value: item.id === e.id ? e.value : item.value
                }))
              );
            }
            setStoreEdit(undefined);
          }}
          closeCb={() => setStoreEdit(undefined)}
        />
      )}
    </>
  );
};

export default Form;
