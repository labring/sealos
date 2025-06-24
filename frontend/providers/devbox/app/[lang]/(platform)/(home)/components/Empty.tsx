import Image from 'next/image';
import { useTranslations } from 'next-intl';

const Empty = () => {
  const t = useTranslations();

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center">
      <Image width={900} height={328} alt={'list-empty'} src={'/images/list-empty.svg'} />
      <div className="absolute top-1/2 left-1/2 flex w-[292px] -translate-x-1/2 translate-y-1/10 flex-col items-center gap-1">
        <div className="text-2xl/8 font-medium">{t('create_your_first_devbox')}</div>
        <div className="text-center text-sm/6 text-zinc-500">
          {t('click_here_to_create_devbox')}
        </div>
      </div>
    </div>
  );
};

export default Empty;
