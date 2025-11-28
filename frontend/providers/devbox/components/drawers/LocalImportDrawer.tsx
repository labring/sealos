'use client';

import { toast } from 'sonner';
import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Loader2,
  FileArchive,
  CloudUpload,
  Repeat,
  Trash2,
  Hourglass
} from 'lucide-react';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter
} from '@sealos/shadcn-ui/drawer';
import { Button } from '@sealos/shadcn-ui/button';
import { Input } from '@sealos/shadcn-ui/input';
import { Label } from '@sealos/shadcn-ui/label';
import { Progress } from '@sealos/shadcn-ui/progress';
import type { LocalImportFormData, ImportStage } from '@/types/import';
import { importDevboxFromLocal } from '@/api/devbox';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import RuntimeSelector from '@/components/RuntimeSelector';

interface LocalImportDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (devboxName: string) => void;
}

const MAX_FILE_SIZE = 500 * 1024 * 1024;

const LocalImportDrawer = ({ open, onClose, onSuccess }: LocalImportDrawerProps) => {
  const t = useTranslations();
  const { getErrorMessage } = useErrorMessage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<LocalImportFormData>({
    name: '',
    file: null,
    templateRepositoryUid: '',
    templateUid: '',
    containerPort: 8080,
    startupCommand: ''
  });

  const [importStage, setImportStage] = useState<ImportStage>('idle');
  const [importError, setImportError] = useState<string>('');
  const [importLogs, setImportLogs] = useState<string>('');
  const [selectedRuntime, setSelectedRuntime] = useState<{
    name: string;
    iconId: string;
    templateRepositoryUid: string;
    templateUid: string;
    version: string;
  } | null>(null);

  const handleRuntimeSelect = (runtime: {
    name: string;
    iconId: string;
    templateRepositoryUid: string;
    templateUid: string;
    version: string;
  }) => {
    setSelectedRuntime(runtime);
    setFormData((prev) => ({
      ...prev,
      templateRepositoryUid: runtime.templateRepositoryUid,
      templateUid: runtime.templateUid
    }));
  };

  const handleVersionChange = (version: string, templateUid: string) => {
    if (selectedRuntime) {
      setSelectedRuntime({
        ...selectedRuntime,
        version,
        templateUid
      });
      setFormData((prev) => ({
        ...prev,
        templateUid
      }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast.error(t('file_format_error'));
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(t('file_size_limit', { limit: '500MB' }));
      return;
    }

    setFormData({ ...formData, file });
  };

  const handleRemoveFile = () => {
    setFormData({ ...formData, file: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const generateDevboxName = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `devbox-${timestamp}-${random}`;
  };

  const handleImport = async () => {
    if (!formData.file || !formData.templateUid) {
      toast.error(t('please_fill_required_fields'));
      return;
    }

    try {
      setImportStage('creating');
      setImportError('');

      const devboxName = generateDevboxName();

      const formDataToSend = new FormData();
      formDataToSend.append('file', formData.file);
      formDataToSend.append('name', devboxName);
      formDataToSend.append('runtime', selectedRuntime?.iconId || '');
      formDataToSend.append('templateUid', formData.templateUid);
      formDataToSend.append('containerPort', formData.containerPort.toString());
      formDataToSend.append('startupCommand', formData.startupCommand || '');
      formDataToSend.append('cpu', '4000');
      formDataToSend.append('memory', '8192');

      setImportStage('waiting');

      const response = await importDevboxFromLocal(formDataToSend, (progressEvent) => {
        const progress = progressEvent.total
          ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
          : 0;

        if (progress === 0) {
          setImportStage('uploading');
          setImportLogs((prev) => prev + '\nUploading local repository...\n');
        } else if (progress > 0 && progress < 100) {
          setImportLogs((prev) => prev + `Uploading: ${progress}%\n`);
        } else if (progress >= 100) {
          setImportStage('extracting');
          setImportLogs((prev) => prev + 'Upload complete\nExtracting files...\n');
        }
      });

      setImportStage('configuring');
      setImportLogs((prev) => prev + 'Configuring environment...\n');
      await new Promise((resolve) => setTimeout(resolve, 500));
      setImportStage('success');
      setImportLogs((prev) => prev + 'DevBox is ready!\n');
      toast.success(t('import_success'));
      setTimeout(() => {
        onSuccess(response.devboxName);
      }, 1000);
    } catch (error: any) {
      console.error('Import failed:', error);
      setImportStage('error');
      const errorMsg = getErrorMessage(error, 'import_failed');
      setImportError(errorMsg);
      setImportLogs((prev) => prev + `\nERR: ${errorMsg}\n`);
      toast.error(errorMsg);
    }
  };

  const handleClose = () => {
    if (importStage !== 'creating' && importStage !== 'uploading') {
      setFormData({
        name: '',
        file: null,
        templateRepositoryUid: '',
        templateUid: '',
        containerPort: 8080,
        startupCommand: ''
      });
      setImportStage('idle');
      setImportError('');
      setImportLogs('');
      setSelectedRuntime(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    }
  };

  const isImporting =
    importStage === 'creating' ||
    importStage === 'uploading' ||
    importStage === 'configuring' ||
    importStage === 'starting';

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DrawerContent className="max-w-[530px]">
        <DrawerHeader className="border-b border-zinc-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-semibold text-zinc-900">
              {t('import_from_local')}
            </DrawerTitle>
          </div>
        </DrawerHeader>

        <div className="flex flex-col gap-5 px-5 py-6 pr-6">
          {isImporting || importStage === 'success' ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4">
                <Hourglass className="h-6 w-6 text-zinc-400" />
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-semibold text-black">{t('will_get_ready_soon')}</h3>
                  <p className="text-sm text-zinc-500">
                    {t('import_process_tip_prefix')}
                    <span className="font-medium text-zinc-900">{t('import_time_estimate')}</span>
                    {t('import_process_tip_suffix')}
                  </p>
                </div>
              </div>

              {importLogs && (
                <div className="flex flex-col gap-4 rounded-xl border border-dashed border-zinc-400 bg-white p-4">
                  <div className="flex flex-col gap-2">
                    {importLogs
                      .split('\n')
                      .filter((log) => log.trim())
                      .map((log, index) => {
                        const isError =
                          log.toLowerCase().includes('error') ||
                          log.toLowerCase().includes('err:') ||
                          log.toLowerCase().includes('fatal') ||
                          log.toLowerCase().includes('failed');

                        return (
                          <div key={index} className="flex gap-4">
                            <div
                              className={`w-0.5 shrink-0 rounded-sm ${isError ? 'bg-red-400' : 'bg-emerald-400'}`}
                            />
                            <p
                              className={`text-sm ${isError ? 'text-red-600' : 'text-zinc-600'} leading-5 break-all`}
                            >
                              {log}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-zinc-900">
                  <span className="text-red-600">*</span>
                  {t('upload_local_repository')}
                </Label>
                <div
                  className={`cursor-pointer rounded-xl text-center transition-colors ${
                    formData.file
                      ? ''
                      : 'border border-dashed border-zinc-400 py-6 hover:border-zinc-500'
                  }`}
                  onClick={() => !formData.file && fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={isImporting}
                  />
                  {formData.file ? (
                    <div
                      className="flex items-center justify-between rounded-xl border border-solid border-zinc-200 bg-white px-3 py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center rounded-lg bg-zinc-100 p-2">
                          <FileArchive className="h-5 w-5 text-zinc-900" />
                        </div>
                        <span className="text-sm font-normal text-zinc-900">
                          {formData.file.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="h-10 gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-600"
                        >
                          <Repeat className="h-4 w-4" />
                          {t('replace')}
                        </Button>
                        <div className="h-4 w-px bg-zinc-200" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile();
                          }}
                          className="h-10 rounded-lg px-3 py-0 hover:bg-zinc-50"
                        >
                          <Trash2 className="h-4 w-4 text-zinc-600" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <CloudUpload className="h-6 w-6 text-zinc-900" />
                      <div className="flex flex-col gap-0">
                        <p className="text-sm font-medium text-zinc-900">
                          {t('drag_drop_or_click')}
                        </p>
                        <p className="text-xs text-zinc-500">{t('support_zip_format_tip')}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-zinc-900">
                  <span className="text-red-600">*</span>
                  {t('runtime')}
                </Label>
                <RuntimeSelector
                  selectedRuntime={selectedRuntime}
                  onRuntimeSelect={handleRuntimeSelect}
                  onVersionChange={handleVersionChange}
                  disabled={isImporting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="container-port" className="text-sm font-medium text-zinc-900">
                  <span className="text-red-600">*</span>
                  {t('container_port')}
                </Label>
                <Input
                  id="container-port"
                  type="number"
                  placeholder="80"
                  value={formData.containerPort}
                  onChange={(e) =>
                    setFormData({ ...formData, containerPort: parseInt(e.target.value) || 0 })
                  }
                  disabled={isImporting}
                  className="h-10 rounded-lg border-zinc-200 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startup-command" className="text-sm font-medium text-zinc-900">
                  <span className="text-red-600">*</span>
                  {t('startup_command')}
                </Label>
                <Input
                  id="startup-command"
                  placeholder={t('startup_command_example')}
                  value={formData.startupCommand}
                  onChange={(e) => setFormData({ ...formData, startupCommand: e.target.value })}
                  disabled={isImporting}
                  className="h-10 rounded-lg border-zinc-200 text-sm placeholder:text-zinc-500"
                />
              </div>

              {importError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm text-red-600">{importError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {!isImporting && importStage !== 'success' && (
          <DrawerFooter className="flex-row gap-3 border-t border-zinc-200 px-6 py-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isImporting}
              className="h-10 flex-1 rounded-lg border-zinc-200 text-sm font-medium"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || !formData.file || !formData.templateUid}
              className="h-10 flex-1 rounded-lg bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800"
            >
              {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('create_devbox')}
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default LocalImportDrawer;
