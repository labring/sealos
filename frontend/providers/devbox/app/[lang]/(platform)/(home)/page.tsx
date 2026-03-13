'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { subDays } from 'date-fns';

import { useGuideStore } from '@/stores/guide';
import { useDateTimeStore } from '@/stores/date';
import { useDevboxList } from './hooks/useDevboxList';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { ALL_TIME_START_DATE } from '@/utils/timeRange';

import List from './components/List';
import Empty from './components/Empty';
import Header from './components/Header';
import { Loading } from '@sealos/shadcn-ui/loading';

export default function HomePage() {
  const searchParams = useSearchParams();
  const action = searchParams.get('action');

  const { resetGuideState } = useGuideStore();
  const { setStartDateTime, setEndDateTime } = useDateTimeStore();
  const isClientSide = useClientSideValue(true);
  const { list, isLoading, refetchList } = useDevboxList();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isClientSide) {
      resetGuideState(!(action === 'guide'));
    }
  }, [action, isClientSide, resetGuideState]);

  useEffect(() => {
    const now = new Date();
    setStartDateTime(new Date(ALL_TIME_START_DATE));
    setEndDateTime(now);

    return () => {
      const resetTime = new Date();
      setStartDateTime(subDays(resetTime, 7));
      setEndDateTime(resetTime);
    };
  }, [setEndDateTime, setStartDateTime]);

  if (isLoading) return <Loading />;

  return (
    <div className="flex h-[calc(100vh-28px)] flex-col px-12">
      <Header onSearch={setSearchQuery} />
      {list.length === 0 ? (
        <Empty />
      ) : (
        <List devboxList={list} refetchDevboxList={refetchList} searchQuery={searchQuery} />
      )}
    </div>
  );
}
