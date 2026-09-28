import useBillingStore from '@/stores/billing';
import { FlexProps } from '@chakra-ui/react';
import { useIsFetching } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import BaseMenu from './BaseMenu';

export default function NamespaceIdMenu({
  isDisabled,
  innerWidth = '360px',
  ...props
}: { isDisabled: boolean; innerWidth?: string } & FlexProps) {
  const { namespaceList, namespaceIdx, setNamespace } = useBillingStore();
  const isFetchingNamespaces = useIsFetching({ queryKey: ['nsList', 'menu'] }) > 0;
  const { t } = useTranslation();

  return (
    <BaseMenu
      {...props}
      isDisabled={isDisabled || isFetchingNamespaces}
      innerWidth={innerWidth}
      itemlist={namespaceList.map(([id]) => id || t('all_workspace_ids'))}
      itemIdx={namespaceIdx}
      setItem={setNamespace}
      searchPlaceholder={t('search_workspace_id')}
      emptyText={t('No Data Available')}
    />
  );
}
