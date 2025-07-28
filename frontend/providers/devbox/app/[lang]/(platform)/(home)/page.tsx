'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import { useGuideStore } from '@/stores/guide';
import { useDevboxList } from './hooks/useDevboxList';
import { useClientSideValue } from '@/hooks/useClientSideValue';

import List from './components/List';
import Empty from './components/Empty';
import Header from './components/Header';
import { Loading } from '@/components/ui/loading';

export default function HomePage() {
  const searchParams = useSearchParams();
  const action = searchParams.get('action');

  const { resetGuideState } = useGuideStore();
  const isClientSide = useClientSideValue(true);
  const { list, isLoading, refetchList } = useDevboxList();

  useEffect(() => {
    if (isClientSide) {
      resetGuideState(!(action === 'guide'));
    }
  }, [action, isClientSide, resetGuideState]);

  if (isLoading) return <Loading />;

  return (
    <div className="flex h-[calc(100vh-28px)] min-w-fit flex-col px-12">
      <Header />
      {list.length === 0 ? <Empty /> : <List devboxList={list} refetchDevboxList={refetchList} />}
    </div>
  );
}
