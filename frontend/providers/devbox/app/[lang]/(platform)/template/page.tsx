'use client';

import { useState } from 'react';
import { debounce } from 'lodash';
import { LayoutTemplate, Search, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
      <div className="flex h-full w-full flex-col gap-5 px-10 py-6">
        <Tabs defaultValue={defaultTab} className="flex flex-col">
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

          <TabsContent value="public" className="h-full">
            <PublicTemplate search={search} />
          </TabsContent>
          {/* <TabsContent value="private" className="h-full">
              <PrivateTemplate search={search} />
            </TabsContent> */}
        </Tabs>
      </div>
    </div>
  );
};

export default TemplatePage;
