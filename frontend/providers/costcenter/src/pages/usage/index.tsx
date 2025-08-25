import Quota from '@/components/valuation/quota';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function Resource() {
  return <Quota />;
}

export async function getServerSideProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'applist'], undefined, ['zh', 'en']))
    }
  };
}
