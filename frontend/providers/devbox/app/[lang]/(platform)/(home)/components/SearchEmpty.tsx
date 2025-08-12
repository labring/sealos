import Image from 'next/image';
import { useTranslations } from 'next-intl';

const Empty = () => {
  const t = useTranslations();

  return (
    <div className="relative flex flex-1 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed">
      <Image width={900} height={328} alt={'search-empty'} src={'/images/search-empty.svg'} />
      <div className="absolute top-1/2 left-1/2 flex w-[292px] -translate-x-1/2 translate-y-1/10 flex-col items-center gap-1">
        <div className="text-2xl/8 font-medium">{t('no_related_devbox')}</div>
        <div className="text-center text-sm/6 text-zinc-500">
          {t('try_change_search_and_filter')}
        </div>
      </div>
    </div>
  );
};

export default Empty;
