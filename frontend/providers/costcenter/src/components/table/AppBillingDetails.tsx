import { Text, Button, ButtonProps } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import DetailsIcon from '../icons/DetailsIcon';
import { useRouter } from 'next/router';
import useBillingStore from '@/stores/billing';

export default function AppOverviewDetails({
  appName,
  appType,
  namespace,
  regionUid,
  ...props
}: {
  appName: string;
  appType: string;
  namespace: string;
  regionUid: string;
} & ButtonProps) {
  const router = useRouter();
  const {
    appNameList,
    namespaceList,
    regionList,
    appTypeList,
    setAppName,
    setAppType,
    setNamespace
  } = useBillingStore();
  const appNameIdx = appNameList.findIndex((v) => v === appName);
  const appTypeIdx = appTypeList.findIndex((v) => v === appType);
  const namespaceIdx = namespaceList.findIndex((v) => v[0] === namespace);
  const toAppDetailPage = () => {
    namespaceIdx >= 0 && setNamespace(namespaceIdx);
    appTypeIdx >= 0 && setAppType(appTypeIdx);
    appNameIdx >= 0 && setAppName(appNameIdx);
    const query = encodeURIComponent(
      `appNameIdx=${appNameIdx}&appTypeIdx=${appTypeIdx}&namespaceIdx=${namespaceIdx}&regionIdx={regionIdx}`
    );
    router.push(`/billing`, {
      query
    });
  };
  const { t } = useTranslation();
  return (
    <Button
      color={'grayModern.900'}
      gap={'4px'}
      px={'8px'}
      py="6px"
      h="unset"
      fontStyle="normal"
      fontWeight="400"
      fontSize="12px"
      lineHeight="140%"
      border={'unset'}
      bg={'grayModern.150'}
      _expanded={{
        background: 'grayModern.150'
      }}
      _hover={{
        background: 'grayModern.150'
      }}
      borderRadius={'2px'}
      onClick={(e) => {
        e.preventDefault();
        toAppDetailPage();
      }}
      _disabled={{
        opacity: '0.5',
        pointerEvents: 'none'
      }}
      {...props}
    >
      <DetailsIcon w="16px" h="16px" />
      <Text>{t('Details')}</Text>
    </Button>
  );
}
