import dayjs from 'dayjs';
import JSZip from 'jszip';
import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Info, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';
import { useRouter } from '@/i18n';
import { downLoadBlob } from '@/utils/tools';
import { useGuideStore } from '@/stores/guide';
import { useGlobalStore } from '@/stores/global';
import type { YamlItemType } from '@/types/index';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { quitGuideDriverObj, startDriver } from '@/hooks/driver';

const Header = ({
  title,
  yamlList,
  applyCb,
  applyBtnText
}: {
  yamlList: YamlItemType[];
  applyCb: () => void;
  title: string;
  applyBtnText: string;
}) => {
  const router = useRouter();
  const t = useTranslations();

  const { lastRoute } = useGlobalStore();
  const { guideConfigDevbox } = useGuideStore();

  const handleExportYaml = useCallback(async () => {
    const zip = new JSZip();
    yamlList.forEach((item) => {
      zip.file(item.filename, item.value);
    });
    const res = await zip.generateAsync({ type: 'blob' });
    downLoadBlob(res, 'application/zip', `yaml${dayjs().format('YYYYMMDDHHmmss')}.zip`);
  }, [yamlList]);

  const isClientSide = useClientSideValue(true);

  const handleBack = useCallback(() => {
    router.replace(lastRoute);
  }, [lastRoute, router]);

  return (
    <>
      {/* TODO: We need fix guide style code later */}
      {!guideConfigDevbox && isClientSide && (
        <div className="flex h-14 w-full items-center justify-center gap-3 border-y border-[#BFDBFE] bg-[#EFF6FF] text-[16px] font-medium text-[#2563EB]">
          <Info size={16} />
          {t('driver.create_app_header')}
        </div>
      )}
      <div className="flex h-24 w-full items-center justify-between self-stretch border-b-1 px-10 py-8">
        {/* left side */}
        <div className="flex cursor-pointer items-center gap-3" onClick={handleBack}>
          <ArrowLeft className="h-6 w-6" />
          <p className="text-2xl/8 font-semibold">{t(title)}</p>
        </div>
        {/* right side */}
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-10" onClick={handleExportYaml}>
            {t('export_yaml')}
          </Button>
          <Button
            className={cn(
              'driver-deploy-button h-10 min-w-30',
              isClientSide && !guideConfigDevbox && 'outline-1 outline-offset-2 outline-[#1C4EF5]'
            )}
            onClick={applyCb}
          >
            {t(applyBtnText)}
          </Button>
          {isClientSide && !guideConfigDevbox && (
            <div className="absolute top-[54px] right-[35%] z-[1000] w-[250px] rounded-xl bg-[#2563EB] p-4 text-white">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t('driver.configure_devbox')}</p>
                <div
                  className="ml-auto cursor-pointer"
                  onClick={() => {
                    startDriver(quitGuideDriverObj(t));
                  }}
                >
                  <X width={'16px'} height={'16px'} />
                </div>
              </div>
              <p className="mt-2 text-start text-sm font-normal whitespace-normal text-[#FFFFFFCC]">
                {t('driver.adjust_resources_as_needed')}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-[13px] font-medium">3/5</p>
                <div
                  className="flex h-8 w-[86px] cursor-pointer items-center justify-center rounded-lg bg-white/20 text-sm font-medium text-white"
                  onClick={() => {
                    applyCb();
                  }}
                >
                  {t('driver.next')}
                </div>
              </div>
              <div className="absolute -top-[10px] right-4 h-0 w-0 rotate-180 border-t-[10px] border-r-8 border-l-8 border-t-[#2563EB] border-r-transparent border-l-transparent" />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Header;
