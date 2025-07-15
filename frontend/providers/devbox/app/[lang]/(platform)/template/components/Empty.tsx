import Image from 'next/image';
import { useTranslations } from 'next-intl';

const Empty = ({ description }: { description?: string }) => {
  const t = useTranslations();

  // TODO: this is ugly, need to fix it
  return (
    <div className="relative flex h-[calc(100vh-300px)] flex-1 flex-col items-center justify-center">
      <Image width={900} height={328} alt={'template-empty'} src={'/images/template-empty.svg'} />
      <div className="absolute top-1/2 left-1/2 flex w-[292px] -translate-x-1/2 translate-y-1/10 flex-col items-center gap-1">
        <div className="text-2xl/8 font-medium">{t('no_template_repository_versions')}</div>
        <div className="text-center text-sm/6 text-zinc-500">
          {description || t('no_template_action')}
        </div>
      </div>
    </div>
  );
};

export default Empty;
