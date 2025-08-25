import Layout from '@/components/Layout';
import { compareFirstLanguages } from '@/utils/tools';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Product from './components/Product';

export default function Pricing() {
  return (
    <Layout>
      <Product />
    </Layout>
  );
}

export async function getServerSideProps({ req, res, locales }: any) {
  const local =
    req?.cookies?.NEXT_LOCALE || compareFirstLanguages(req?.headers?.['accept-language'] || 'zh');
  res.setHeader('Set-Cookie', `NEXT_LOCALE=zh; Max-Age=2592000; Secure; SameSite=None`);

  return {
    props: {
      ...(await serverSideTranslations(local, undefined, null, locales || []))
    }
  };
}
