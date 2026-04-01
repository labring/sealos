import dynamic from 'next/dynamic';

const ApiV2AlphaDocs = dynamic(() => import('@/components/ApiV2AlphaDocs'), { ssr: false });

export default function ApiV2AlphaDocsPage() {
  return <ApiV2AlphaDocs />;
}
