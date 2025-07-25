'use client';

import { useState } from 'react';
import { debounce } from 'lodash';
import { LayoutTemplate, Search, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import Header from './components/Header';
import PrivateTemplate from './components/PrivateTemplate';
import PublicTemplate from './components/PublicTemplate';

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
      <div className="flex h-full w-full flex-col gap-5 px-10 pt-6">
        <Tabs defaultValue={defaultTab} className="flex flex-col">
          <div className="flex items-center justify-between gap-4">
            <TabsList variant="ghost" className="w-fit">
              <TabsTrigger value="public" variant="ghost" className="p-2">
                <LayoutTemplate className="!h-5 !w-5" />
                <span className="text-base">{t('all_templates')}</span>
              </TabsTrigger>
              <TabsTrigger value="private" variant="ghost" className="p-2">
                <User className="!h-5 !w-5" />
                <span className="text-base">{t('my_templates')}</span>
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center pr-2">
              <Input
                className="w-[370px]"
                icon={<Search className="h-4 w-4 text-zinc-500" />}
                placeholder={t('template_search')}
                onChange={(e) => updateSearchVal(e.target.value)}
              />
            </div>
          </div>

          <TabsContent value="public" className="h-full">
            <PublicTemplate search={search} />
          </TabsContent>
          <TabsContent value="private" className="h-full">
            <PrivateTemplate search={search} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TemplatePage;
