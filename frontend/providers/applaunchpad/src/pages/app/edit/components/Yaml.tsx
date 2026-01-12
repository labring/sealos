import React, { useState } from 'react';
import YamlCode from '@/components/YamlCode/index';
import styles from './index.module.scss';
import { useCopyData } from '@/utils/tools';
import type { YamlItemType, QueryType } from '@/types';
import { obj2Query } from '@/api/tools';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { Copy, FileCode2, Check } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@sealos/shadcn-ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@sealos/shadcn-ui/tooltip';

const Yaml = ({ yamlList = [], pxVal }: { yamlList: YamlItemType[]; pxVal: number }) => {
  const router = useRouter();
  const { name } = router.query as QueryType;
  const { copyData } = useCopyData();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const { t } = useTranslation();

  const handleCopy = (content: string) => {
    copyData(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      className="h-full grid gap-5 items-start max-w-[1200px] w-full"
      style={{
        gridTemplateColumns: '266px 1fr'
      }}
    >
      {/* Left Sidebar */}
      <div className="flex flex-col gap-4">
        {/* Form/YAML Toggle */}
        <Tabs defaultValue="yaml" className="w-full">
          <TabsList className="w-full h-auto bg-zinc-100 rounded-xl">
            <TabsTrigger
              value="form"
              className="flex-1 h-9 text-sm font-normal"
              onClick={() =>
                router.replace(
                  `/app/edit?${obj2Query({
                    name,
                    type: 'form'
                  })}`
                )
              }
            >
              {t('Config Form')}
            </TabsTrigger>
            <TabsTrigger
              value="yaml"
              className="flex-1 h-9 text-sm rounded-lg font-medium shadow-sm"
            >
              {t('YAML File')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* File List */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white overflow-hidden">
          {yamlList.map((file, index) => (
            <div
              key={file.filename}
              className={`
                flex items-center h-12 gap-2 px-5 text-zinc-500 cursor-pointer transition-colors ${
                  index === yamlList.length - 1 ? 'border-b-0' : 'border-b border-zinc-100'
                }
                hover:bg-zinc-100
                ${index === selectedIndex ? 'bg-zinc-100' : 'text-zinc-900 bg-transparent'}
              `}
              onClick={() => setSelectedIndex(index)}
            >
              <FileCode2
                className={`w-5 h-5 ${
                  index === selectedIndex ? 'text-zinc-900' : 'text-zinc-400'
                } shrink-0`}
              />
              <span
                className={`text-sm ${
                  index === selectedIndex ? 'font-normal text-zinc-900' : 'text-zinc-500'
                }`}
              >
                {file.filename}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Content - YAML Code */}
      {!!yamlList[selectedIndex] && (
        <div
          className={`${styles.codeBox} flex flex-col h-full overflow-hidden border border-zinc-200 rounded-lg relative`}
        >
          {/* Header */}
          <div className="flex items-center px-8 pt-8 pb-5 bg-white">
            <h2 className="flex-1 text-xl font-bold text-zinc-900">
              {yamlList[selectedIndex].filename}
            </h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-2 rounded-md cursor-pointer"
                    onClick={() => handleCopy(yamlList[selectedIndex].value)}
                  >
                    {isCopied ? (
                      <Check className="w-5 h-5 text-neutral-400" />
                    ) : (
                      <Copy className="w-5 h-5 text-neutral-400" />
                    )}
                  </button>
                </TooltipTrigger>
                {!isCopied && (
                  <TooltipContent>
                    <p>{t('click_to_copy_tooltip')}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Code Content */}
          <div className="flex-1 h-0 overflow-auto bg-white px-8 pb-8">
            <YamlCode className={styles.code} content={yamlList[selectedIndex].value} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Yaml;
