'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import { useGuideStore } from '@/stores/guide';
import { useLoading } from '@/hooks/useLoading';
import { useDevboxList } from './hooks/useDevboxList';
import { useClientSideValue } from '@/hooks/useClientSideValue';

import Empty from './components/Empty';
import DevboxList from './components/List';
import DevboxHeader from './components/Header';

export default function HomePage() {
  const searchParams = useSearchParams();
  const action = searchParams.get('action');

  const { resetGuideState } = useGuideStore();
  const isClientSide = useClientSideValue(true);
  const { Loading } = useLoading();
  const { list, isLoading, refetchList } = useDevboxList();

  useEffect(() => {
    if (isClientSide) {
      resetGuideState(!(action === 'guide'));
    }
  }, [action, isClientSide, resetGuideState]);

  if (isLoading) {
    /* TODO: we need a single loading component here */

    return <Loading loading={isLoading} />;
  }

  return (
    <div className="flex h-[calc(100vh-28px)] w-fit flex-col px-12">
      <DevboxHeader listLength={list.length} />
      {list.length === 0 ? (
        <Empty />
      ) : (
        <DevboxList devboxList={list} refetchDevboxList={refetchList} />
      )}
    </div>
  );
}
