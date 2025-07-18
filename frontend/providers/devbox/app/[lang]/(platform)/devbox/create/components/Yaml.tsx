import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, FileCode } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import Code from '@/components/Code';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { cn } from '@/lib/utils';
import { useRouter } from '@/i18n';
import type { YamlItemType } from '@/types';
import { obj2Query, useCopyData } from '@/utils/tools';

const Yaml = ({ yamlList = [] }: { yamlList: YamlItemType[] }) => {
  const router = useRouter();
  const t = useTranslations();
  const { copyData } = useCopyData();
  const searchParams = useSearchParams();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const devboxName = searchParams.get('name') as string;

  const handleTabsChange = (value: string) => {
    if (value === 'form') {
      router.replace(
        `/devbox/create?${obj2Query({
          type: 'form',
          name: devboxName
        })}`
      );
    }
  };

  return (
    <div className="flex gap-6">
      {/* left side */}
      <div className="flex min-w-65 flex-col gap-4">
        <Tabs defaultValue="yaml" onValueChange={handleTabsChange}>
          <TabsList className="h-11 w-full">
            <TabsTrigger value="form">{t('config_form')}</TabsTrigger>
            <TabsTrigger value="yaml">{t('yaml_file')}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-col rounded-xl border-1 border-zinc-200">
          {yamlList.map((file, index) => (
            <div
              key={file.filename}
              className={cn(
                'flex h-10 cursor-pointer items-center bg-white px-5 py-6 text-zinc-500',
                index === selectedIndex && 'bg-gray-100 text-zinc-900',
                index === 0 && 'rounded-t-xl',
                index === yamlList.length - 1 && 'rounded-b-xl'
              )}
              onClick={() => setSelectedIndex(index)}
            >
              <div className={cn('flex items-center gap-2')}>
                <FileCode className="h-5 w-5" />
                <span>{file.filename}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* right side */}
      {!!yamlList[selectedIndex] && (
        <Card className="flex h-[calc(100vh-200px)] w-full flex-col gap-5 overflow-hidden p-8">
          {/* header */}
          <div className="flex items-center justify-between">
            <h3 className="text-xl/7 font-medium">{yamlList[selectedIndex].filename}</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-fit w-fit"
              onClick={() => copyData(yamlList[selectedIndex].value)}
            >
              <Copy className="!h-5 !w-5 text-neutral-400" />
            </Button>
          </div>
          {/* content */}
          <ScrollArea className="w-full">
            <Code content={yamlList[selectedIndex].value} language="yaml" />
          </ScrollArea>
        </Card>
      )}
    </div>
  );
};

export default Yaml;
