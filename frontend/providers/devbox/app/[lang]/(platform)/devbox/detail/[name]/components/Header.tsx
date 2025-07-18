import { useState } from 'react';
import { ArrowLeft, Terminal, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';

import { useRouter } from '@/i18n';
import { useGuideStore } from '@/stores/guide';
import { useDevboxStore } from '@/stores/devbox';
import { DevboxDetailTypeV2 } from '@/types/devbox';
import { DevboxStatusEnum } from '@/constants/devbox';
import { useControlDevbox } from '@/hooks/useControlDevbox';

import IDEButton from '@/components/IDEButton';
import { Button } from '@/components/ui/button';
import DevboxStatusTag from '@/components/StatusTag';
import { ButtonGroup } from '@/components/ui/button-group';
import ShutdownModal from '@/components/dialogs/ShutdownDialog';
import DeleteDevboxModal from '@/components/dialogs/DeleteDevboxDialog';

interface HeaderProps {
  refetchDevboxDetail: () => void;
}

const Header = ({ refetchDevboxDetail }: HeaderProps) => {
  const router = useRouter();
  const t = useTranslations();

  const { guideIDE } = useGuideStore();
  const { devboxDetail, setDevboxList } = useDevboxStore();
  const { handleRestartDevbox, handleStartDevbox, handleGoToTerminal } =
    useControlDevbox(refetchDevboxDetail);

  const [onOpenShutdown, setOnOpenShutdown] = useState(false);
  const [delDevbox, setDelDevbox] = useState<DevboxDetailTypeV2 | null>(null);

  const { refetch: refetchDevboxList } = useQuery(['devboxListQuery'], setDevboxList, {
    onSettled(res) {
      if (!res) return;
    }
  });

  if (!devboxDetail) return null;

  return (
    <div className="flex min-h-20 w-full items-center justify-between gap-5">
      {/* left */}
      <div className="flex h-6 min-w-fit cursor-pointer items-center">
        <div
          className="flex h-12 w-12 cursor-pointer items-center justify-center"
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="h-6 w-6" />
        </div>
        <div className="mr-3 text-xl font-semibold">{devboxDetail.name}</div>
        <DevboxStatusTag
          status={devboxDetail.status}
          isShutdown={devboxDetail.status.value === DevboxStatusEnum.Shutdown}
        />
      </div>
      {/* right */}
      <div className="flex h-10 gap-3">
        <Button
          size="icon"
          variant="outline"
          className="h-10 w-10 bg-white text-neutral-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          onClick={() => setDelDevbox(devboxDetail)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 bg-white text-neutral-500 hover:text-neutral-600"
          disabled={devboxDetail.status.value !== 'Running'}
          onClick={() => handleGoToTerminal(devboxDetail)}
        >
          <Terminal className="h-4 w-4" />
        </Button>
        <ButtonGroup>
          {devboxDetail.status.value === 'Stopped' || devboxDetail.status.value === 'Shutdown' ? (
            <Button variant="outline" size="lg" onClick={() => handleStartDevbox(devboxDetail)}>
              {t('start')}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="lg"
              className="guide-close-button"
              onClick={() => setOnOpenShutdown(true)}
            >
              {t('pause')}
            </Button>
          )}
          <Button
            variant="outline"
            size="lg"
            onClick={() => router.push(`/devbox/create?name=${devboxDetail.name}&from=detail`)}
          >
            {t('update')}
          </Button>
          <Button variant="outline" size="lg" onClick={() => handleRestartDevbox(devboxDetail)}>
            {t('restart')}
          </Button>
        </ButtonGroup>
        <IDEButton
          isGuide={!guideIDE}
          runtimeType={devboxDetail.iconId}
          devboxName={devboxDetail.name}
          sshPort={devboxDetail.sshPort as number}
          status={devboxDetail.status}
          leftButtonProps={{
            className:
              'h-[39px] border border-r-[0.5px] border-r-[rgba(228,228,231,0.20)] border-l-zinc-900 border-t-zinc-900 border-b-zinc-900 bg-zinc-900 text-white rounded-r-none hover:bg-zinc-800'
          }}
          rightButtonProps={{
            className:
              'h-[39px] border border-l-[0.5px] border-l-[rgba(228,228,231,0.20)] border-r-zinc-900 border-t-zinc-900 border-b-zinc-900 bg-zinc-900 text-white rounded-l-none hover:bg-zinc-800'
          }}
        />
      </div>
      {/* dialogs */}
      {!!delDevbox && (
        <DeleteDevboxModal
          devbox={delDevbox}
          onClose={() => setDelDevbox(null)}
          onSuccess={() => {
            setDelDevbox(null);
            router.push('/');
          }}
          refetchDevboxList={refetchDevboxList}
        />
      )}
      {!!devboxDetail && (
        <ShutdownModal
          open={!!onOpenShutdown}
          onSuccess={() => {
            refetchDevboxDetail();
            setOnOpenShutdown(false);
          }}
          onClose={() => {
            setOnOpenShutdown(false);
          }}
          devbox={devboxDetail}
        />
      )}
    </div>
  );
};

export default Header;
