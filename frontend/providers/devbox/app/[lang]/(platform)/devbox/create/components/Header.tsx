import dayjs from 'dayjs';
import JSZip from 'jszip';
import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Info, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';
import { useRouter } from '@/i18n';
import { downLoadBlob } from '@/utils/tools';
import { useGuideStore } from '@/stores/guide';
import type { YamlItemType } from '@/types/index';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { quitGuideDriverObj, startDriver } from '@/hooks/driver';

interface HeaderProps {
  yamlList: YamlItemType[];
  applyCb: () => void;
  title: string;
  applyBtnText: string;
}

const Header = ({ title, yamlList, applyCb, applyBtnText }: HeaderProps) => {
  const router = useRouter();
  const t = useTranslations();
  const searchParams = useSearchParams();
  const name = searchParams.get('name');
  const from = searchParams.get('from') as 'list' | 'detail';

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
    if (name) {
      if (from === 'detail') {
        router.replace(`/devbox/detail/${name}`);
      } else if (from === 'list') {
        router.replace(`/`);
      }
    } else {
      router.push('/template');
    }
  }, [name, router, from]);

  return (
    <>
      {!guideConfigDevbox && isClientSide && (
        <div className="flex min-h-14 w-full items-center justify-center gap-3 border-y border-blue-200 bg-blue-50 font-medium text-blue-600">
          <Info size={16} />
          {t('driver.create_app_header')}
        </div>
      )}
      <div className="flex h-24 w-full items-center justify-between self-stretch border-b-1 px-10 py-8">
        {/* left side */}
        <div className="flex cursor-pointer items-center">
          <div
            className="flex h-12 w-12 cursor-pointer items-center justify-center"
            onClick={handleBack}
          >
            <ArrowLeft className="h-6 w-6" />
          </div>
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
              isClientSide && !guideConfigDevbox && 'outline-2 outline-offset-2 outline-blue-600'
            )}
            onClick={applyCb}
          >
            {t(applyBtnText)}
          </Button>
          {isClientSide && !guideConfigDevbox && (
            <div className="absolute top-34 right-18 z-[1000] w-[250px] rounded-xl bg-blue-600 p-4 text-white">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">{t('driver.configure_devbox')}</p>
                <div
                  className="ml-auto cursor-pointer"
                  onClick={() => {
                    startDriver(quitGuideDriverObj(t));
                  }}
                >
                  <X className="h-4 w-4 text-[#7CA1F3]" strokeWidth={2} />
                </div>
              </div>
              <p className="text-start text-sm font-normal whitespace-normal text-white">
                {t('driver.adjust_resources_as_needed')}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-[13px] font-medium">4/5</p>
                <Button
                  size={'sm'}
                  className="bg-white/20 text-sm font-medium text-white hover:bg-white/10 hover:text-white"
                  onClick={() => {
                    applyCb();
                  }}
                >
                  {t('driver.next')}
                </Button>
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
