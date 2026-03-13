import { quitGuideDriverObj, startDriver } from '@/hooks/driver';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { useGlobalStore } from '@/store/global';
import { useGuideStore } from '@/store/guide';
import type { YamlItemType } from '@/types/index';
import type { AppEditType } from '@/types/app';
import { downLoadBold } from '@/utils/tools';
import { Button } from '@sealos/shadcn-ui/button';
import { track } from '@sealos/gtm';
import dayjs from 'dayjs';
import { ArrowLeft, Info, X } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useCallback } from 'react';
import { formData2Yamls } from '../index';

const Header = ({
  appName,
  title,
  yamlList,
  getFormData,
  applyCb,
  applyBtnText
}: {
  appName: string;
  title: string;
  yamlList: YamlItemType[];
  getFormData?: () => AppEditType;
  applyCb: () => void;
  applyBtnText: string;
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { lastRoute } = useGlobalStore();
  const isClientSide = useClientSideValue(true);

  const handleExportYaml = useCallback(async () => {
    let exportYamlList: YamlItemType[];
    if (getFormData) {
      const formData = getFormData();
      exportYamlList = formData2Yamls(formData);
    } else {
      exportYamlList = yamlList;
    }

    const exportYamlString = exportYamlList.map((i) => i.value).join('---\n');
    if (!exportYamlString) return;
    downLoadBold(
      exportYamlString,
      'application/yaml',
      appName ? `${appName}.yaml` : `yaml${dayjs().format('YYYYMMDDHHmmss')}.yaml`
    );
  }, [appName, yamlList, getFormData]);

  const { createCompleted, startTimeMs } = useGuideStore();

  return (
    <div className="fixed top-0 left-0 right-0 z-10 flex w-full flex-col bg-zinc-50">
      {isClientSide && !createCompleted && (
        <div className="flex h-14 w-full items-center justify-center gap-3 border-y border-blue-200 bg-blue-50 text-base font-medium text-blue-600">
          <Info size={16} />
          {t('driver.create_launchpad_header')}
        </div>
      )}
      <div className="flex h-24 w-full items-center border-b-1 border-zinc-200 px-10">
        <div
          className="flex cursor-pointer items-center gap-1.5"
          onClick={() => {
            router.replace(lastRoute);
          }}
        >
          <ArrowLeft className="h-6 w-6" />
          <span className="text-2xl font-semibold text-zinc-900">{t(title)}</span>
        </div>
        <div className="flex-1"></div>
        <Button
          variant="outline"
          className="mr-3.5 h-10 min-w-[120px] rounded-lg shadow-none hover:bg-zinc-50"
          onClick={handleExportYaml}
        >
          {t('Export')} Yaml
        </Button>
        <div className="relative">
          <Button
            className={`driver-deploy-button h-10 min-w-[120px] rounded-lg shadow-none ${
              isClientSide && !createCompleted
                ? 'outline outline-2 outline-offset-2 outline-blue-600'
                : ''
            }`}
            onClick={applyCb}
          >
            {t(applyBtnText)}
          </Button>
          {isClientSide && !createCompleted && (
            <div className="absolute -left-[180px] -bottom-[170px] z-[1000] w-[250px] rounded-xl bg-blue-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{t('driver.configure_launchpad')}</span>
                <div
                  className="ml-auto cursor-pointer"
                  onClick={() => {
                    track('guide_exit', {
                      module: 'guide',
                      guide_name: 'applaunchpad',
                      duration_seconds: (Date.now() - (startTimeMs ?? Date.now())) / 1000,
                      progress_step: 3
                    });

                    startDriver(quitGuideDriverObj(t));
                  }}
                >
                  <X width={16} height={16} />
                </div>
              </div>
              <p className="mt-2 whitespace-normal text-start text-sm font-normal text-white/80">
                {t('driver.define_image_settings')}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[13px] font-medium">3/4</span>
                <div
                  className="flex h-8 w-[86px] cursor-pointer items-center justify-center rounded-lg bg-white/20 text-sm font-medium text-white"
                  onClick={() => {
                    applyCb();
                  }}
                >
                  {t('driver.next')}
                </div>
              </div>
              {/* Triangle pointer */}
              <div
                className="absolute -top-2.5 right-4 h-0 w-0 rotate-180"
                style={{
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '10px solid #2563EB'
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;
