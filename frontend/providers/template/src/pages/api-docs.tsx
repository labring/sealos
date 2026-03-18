import dynamic from 'next/dynamic';

const ApiDocs = dynamic(() => import('@/components/ApiDocs'), { ssr: false });

export default function References() {
  return <ApiDocs />;
}
