import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@sealos/shadcn-ui/dialog';

const ConfigMapDetailModal = ({
  mountPath,
  value,
  onClose
}: {
  mountPath: string;
  value: string;
  onClose: () => void;
}) => {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[600px] max-w-[90vw] text-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold leading-none">{mountPath}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto bg-zinc-50 rounded-lg p-4">
          <pre className="whitespace-pre-wrap text-sm font-mono text-zinc-900">{value}</pre>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfigMapDetailModal;
