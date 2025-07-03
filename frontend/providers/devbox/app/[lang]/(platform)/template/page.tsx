'use client';

import { useState } from 'react';
import { debounce } from 'lodash';
import { LayoutTemplate, Search, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { usePathname } from '@/i18n';
import { TemplateState } from '@/constants/template';

import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import Header from './components/Header';
import PrivatePanel from './components/PrivateTemplate';
import PublicPanel from './components/PublicTemplate';

const TemplatePage = () => {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const updateSearchVal = debounce((val: string) => {
    setSearch(val);
  }, 500);

  const defaultTab = searchParams.get('tab') === 'private' ? 'private' : 'public';

  return (
    <div className="flex h-full w-full flex-col">
      <Header />
      <div className="flex h-full w-full flex-col gap-5 px-10 py-6">
        <Tabs defaultValue={defaultTab} className="flex flex-1 flex-col">
          <div className="flex items-center justify-between gap-4">
            <TabsList variant="ghost" className="w-fit">
              <TabsTrigger value="public" variant="ghost">
                <LayoutTemplate className="h-4 w-4" />
                <span>{t('all_templates')}</span>
              </TabsTrigger>
              <TabsTrigger value="private" variant="ghost">
                <User className="h-4 w-4" />
                <span>{t('my_templates')}</span>
              </TabsTrigger>
            </TabsList>

            <Input
              className="w-[370px]"
              icon={<Search className="h-4 w-4 text-zinc-500" />}
              placeholder={t('template_search')}
              onChange={(e) => updateSearchVal(e.target.value)}
            />
          </div>

          {/* <ScrollArea className="mt-4 flex-1">
            <TabsContent value="public" className="h-full">
              <PublicPanel search={search} />
            </TabsContent>
            <TabsContent value="private" className="h-full">
              <PrivatePanel search={search} />
            </TabsContent>
          </ScrollArea> */}
        </Tabs>
      </div>
    </div>
  );
};

export default TemplatePage;
