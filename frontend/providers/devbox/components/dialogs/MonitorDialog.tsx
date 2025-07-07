import { useTranslations } from 'next-intl';

import PodLineChart from '@/components/MonitorChart';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { useDevboxStore } from '@/stores/devbox';

interface MonitorDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const MonitorDialog = ({ onClose, isOpen }: MonitorDialogProps) => {
  const t = useTranslations();
  const { devboxDetail } = useDevboxStore();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw]">
        <DialogHeader>
          <DialogTitle>{t('monitor')}</DialogTitle>
        </DialogHeader>
        {devboxDetail && (
          <div className="text-xs font-bold text-gray-900">
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
              <div className="mb-3">
                CPU&ensp;({devboxDetail.usedCpu.yData[devboxDetail.usedCpu.yData.length - 1]}%)
              </div>
              <div className="h-[100px]">
                <PodLineChart type={'blue'} data={devboxDetail.usedCpu} isShowLabel />
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
              <div className="mb-3">
                {t('memory')}&ensp;(
                {devboxDetail.usedMemory.yData[devboxDetail.usedMemory.yData.length - 1]}%)
              </div>
              <div className="h-[100px]">
                <PodLineChart type={'purple'} data={devboxDetail.usedMemory} isShowLabel />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MonitorDialog;
