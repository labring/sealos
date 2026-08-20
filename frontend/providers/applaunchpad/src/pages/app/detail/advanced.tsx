import AdvancedInfo from '@/components/app/detail/index/AdvancedInfo';
import DetailLayout from '@/components/layouts/DetailLayout';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import { useAppStore } from '@/store/app';
import { serviceSideProps } from '@/utils/i18n';
import React from 'react';

export default function AdvancedConfigPage({ appName }: { appName: string }) {
  const { appDetail = MOCK_APP_DETAIL } = useAppStore();

  return (
    <DetailLayout appName={appName} key={'advanced'}>
      <div className="flex-1 h-full overflow-y-auto scrollbar-hide">
        <AdvancedInfo app={appDetail} />
      </div>
    </DetailLayout>
  );
}

export async function getServerSideProps(content: any) {
  const appName = content?.query?.name || '';

  return {
    props: {
      appName,
      ...(await serviceSideProps(content))
    }
  };
}
