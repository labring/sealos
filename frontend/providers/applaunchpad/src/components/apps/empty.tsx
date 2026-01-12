import Image from 'next/image';
import { useTranslation } from 'next-i18next';

interface EmptyProps {
  onCreateApp: () => void;
}

const Empty = ({ onCreateApp }: EmptyProps) => {
  const { t } = useTranslation();

  return (
    <div
      className="relative flex flex-1 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed mb-12"
      onClick={onCreateApp}
    >
      <Image width={900} height={310} alt={'list-empty'} src={'/images/list-empty.svg'} />
      <div className="absolute top-1/2 left-1/2 flex w-[292px] -translate-x-1/2 translate-y-1/20 flex-col items-center gap-1">
        <div className="text-2xl font-medium mb-1">{t('create_your_first_application')}</div>
        <div className="text-center text-base font-normal text-zinc-500">
          {t('click_here_to_create_application')}
        </div>
      </div>
    </div>
  );
};

export default Empty;
