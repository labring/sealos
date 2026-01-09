import PodLineChart from '@/components/PodLineChart';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import { useAppStore } from '@/store/app';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@sealos/shadcn-ui/dialog';
import { useTranslation } from 'next-i18next';

const MonitorModal = ({ onClose, isOpen }: { isOpen: boolean; onClose: () => void }) => {
  const { t } = useTranslation();
  const { appDetail = MOCK_APP_DETAIL } = useAppStore();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-zinc-900">
            {t('Real-time Monitoring')}
          </DialogTitle>
        </DialogHeader>

        <div className="text-xs font-bold text-zinc-900 space-y-4">
          <div className="p-6 bg-zinc-50 border border-zinc-200 rounded-lg">
            <div className="mb-3">
              CPU&ensp;({appDetail.usedCpu.yData[appDetail.usedCpu.yData.length - 1]}%)
            </div>
            <div className="h-[100px]">
              <PodLineChart type={'blue'} data={appDetail.usedCpu} isShowLabel />
            </div>
          </div>
          <div className="p-6 bg-zinc-50 border border-zinc-200 rounded-lg">
            <div className="mb-3">
              {t('Memory')}&ensp;(
              {appDetail.usedMemory.yData[appDetail.usedMemory.yData.length - 1]}%)
            </div>
            <div className="h-[100px]">
              <PodLineChart type={'purple'} data={appDetail.usedMemory} isShowLabel />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MonitorModal;
