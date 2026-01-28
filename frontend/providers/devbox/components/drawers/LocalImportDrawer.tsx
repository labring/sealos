'use client';

import { toast } from 'sonner';
import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, FileArchive, CloudUpload, Repeat, Trash2, Hourglass } from 'lucide-react';

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
import { Textarea } from '@sealos/shadcn-ui/textarea';
import { Checkbox } from '@sealos/shadcn-ui/checkbox';
import type { LocalImportFormData, ImportStage } from '@/types/import';
import { createDevbox, getDevboxByName, uploadAndExtractFile, autostartDevbox } from '@/api/devbox';
import { getTemplate } from '@/api/template';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import RuntimeSelector from '@/components/RuntimeSelector';
import { useGlobalStore } from '@/stores/global';
import { convertZipToTar } from '@/utils/archiveConverter';

interface LocalImportDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (devboxName: string) => void;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const LocalImportDrawer = ({ open, onClose, onSuccess }: LocalImportDrawerProps) => {
  const t = useTranslations();
  const { getErrorMessage } = useErrorMessage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setIsImporting } = useGlobalStore();

  const [formData, setFormData] = useState<LocalImportFormData>({
    name: '',
    file: null,
    templateRepositoryUid: '',
    templateUid: '',
    containerPort: 8080,
    startupCommand: '',
    autoStart: false
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
  const [formErrors, setFormErrors] = useState<{
    file?: string;
    runtime?: string;
    containerPort?: string;
    startupCommand?: string;
  }>({});
  const [isDragging, setIsDragging] = useState(false);

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
      toast.error(t('file_size_limit', { limit: '100MB' }));
      return;
    }

    setFormData({ ...formData, file });
    if (formErrors.file) {
      setFormErrors({ ...formErrors, file: undefined });
    }
  };

  const handleRemoveFile = () => {
    setFormData({ ...formData, file: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!formData.file && !isImporting) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (formData.file || isImporting) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];

      if (!file.name.endsWith('.zip')) {
        toast.error(t('file_format_error'));
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(t('file_size_limit', { limit: '100MB' }));
        return;
      }

      setFormData({ ...formData, file });
      if (formErrors.file) {
        setFormErrors({ ...formErrors, file: undefined });
      }
    }
  };

  const generateDevboxName = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `devbox-${timestamp}-${random}`;
  };

  const validateForm = () => {
    const errors: typeof formErrors = {};

    if (!formData.file) {
      errors.file = t('please_upload_file');
    }

    if (!formData.templateUid) {
      errors.runtime = t('please_select_runtime');
    }

    if (!formData.containerPort || formData.containerPort <= 0) {
      errors.containerPort = t('please_enter_valid_port');
    }

    if (!formData.startupCommand) {
      errors.startupCommand = t('please_enter_startup_command');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const waitForDevboxReady = async (devboxName: string, maxRetries = 60): Promise<boolean> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const devbox = await getDevboxByName(devboxName);
        if (devbox.status?.value === 'Running') {
          return true;
        }
        setImportLogs(
          (prev) => `${prev}\nWaiting for devbox to be ready... (${i + 1}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('Error checking devbox status:', error);
      }
    }
    return false;
  };

  const handleImport = async () => {
    if (!validateForm()) {
      toast.error(t('please_fill_required_fields'));
      return;
    }

    try {
      setIsImporting(true);
      setImportStage('creating');
      setImportError('');
      setImportLogs('Creating devbox...');

      const devboxName = generateDevboxName();

      const templateData = await getTemplate(formData.templateUid);

      await createDevbox({
        name: devboxName,
        templateUid: formData.templateUid,
        templateRepositoryUid: templateData.template.templateRepositoryUid,
        templateConfig: templateData.template.config,
        image: templateData.template.image,
        cpu: 4000,
        memory: 8192,
        storage: 1024 * 10, // 10Gi
        networks: [
          {
            port: formData.containerPort,
            protocol: 'HTTP',
            openPublicDomain: true
          } as any
        ]
      });

      setImportStage('waiting');
      setImportLogs('Devbox created, waiting for it to be ready...');

      const isReady = await waitForDevboxReady(devboxName);
      if (!isReady) {
        throw new Error(t('devbox_ready_timeout'));
      }

      setImportStage('uploading');
      setImportLogs('Devbox is ready, converting archive format...');

      const tarFile = await convertZipToTar(formData.file!);
      setImportLogs('Archive converted, starting file upload...');

      const formDataToSend = new FormData();
      formDataToSend.append('file', tarFile);
      formDataToSend.append('devboxName', devboxName);
      formDataToSend.append('startupCommand', formData.startupCommand || '');

      let lastProgress = 0;

      await uploadAndExtractFile(formDataToSend, (progressEvent) => {
        const progress = progressEvent.total
          ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
          : 0;

        if (progress > 0 && progress !== lastProgress) {
          lastProgress = progress;

          if (progress < 100) {
            setImportLogs(`Uploading file... ${progress}%`);
          } else {
            setImportStage('extracting');
            setImportLogs(`Upload complete (100%)\nExtracting and configuring...`);
          }
        }
      });

      setImportStage('success');
      setImportLogs('Import completed successfully');
      toast.success(t('import_success'));

      if (formData.autoStart) {
        try {
          await autostartDevbox({
            devboxName,
            execCommand: 'nohup /home/devbox/project/entrypoint.sh > /dev/null 2>&1 &'
          });
          toast.success(t('autostart_initiated'));
        } catch (error) {
          console.error('Autostart failed:', error);
          toast.warning(t('autostart_failed_but_import_success'));
        }
      }

      onSuccess(devboxName);
      onClose();
    } catch (error: any) {
      console.error('Import failed:', error);
      setImportStage('error');
      const errorMsg = getErrorMessage(error, 'import_failed');
      setImportError(errorMsg);
      setImportLogs(`ERR: ${errorMsg}`);
      toast.error(errorMsg);
    } finally {
      setIsImporting(false);
    }
  };

  const isImporting =
    importStage === 'creating' ||
    importStage === 'waiting' ||
    importStage === 'uploading' ||
    importStage === 'extracting' ||
    importStage === 'configuring' ||
    importStage === 'starting';

  const handleClose = () => {
    if (!isImporting) {
      setFormData({
        name: '',
        file: null,
        templateRepositoryUid: '',
        templateUid: '',
        containerPort: 8080,
        startupCommand: '',
        autoStart: false
      });
      setImportStage('idle');
      setImportError('');
      setImportLogs('');
      setSelectedRuntime(null);
      setFormErrors({});
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsImporting(false);
      onClose();
    }
  };

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
                <div className="max-h-80 overflow-y-auto rounded-xl border border-dashed border-zinc-400 bg-white p-4">
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
                              className={`text-sm ${isError ? 'text-red-600' : 'text-zinc-600'} leading-relaxed break-all`}
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
                <Label className="text-sm font-medium text-zinc-900" required>
                  {t('upload_local_repository')}
                </Label>
                <div
                  className={`cursor-pointer rounded-xl text-center transition-colors ${
                    formData.file
                      ? ''
                      : `border border-dashed py-6 hover:border-zinc-500 ${
                          formErrors.file
                            ? 'border-red-500'
                            : isDragging
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-zinc-400'
                        }`
                  }`}
                  onClick={() => !formData.file && fileInputRef.current?.click()}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
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
                {formErrors.file && <p className="text-sm text-red-600">{formErrors.file}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-zinc-900" required>
                  {t('runtime')}
                </Label>
                <RuntimeSelector
                  selectedRuntime={selectedRuntime}
                  onRuntimeSelect={(runtime) => {
                    handleRuntimeSelect(runtime);
                    if (formErrors.runtime) {
                      setFormErrors({ ...formErrors, runtime: undefined });
                    }
                  }}
                  onVersionChange={handleVersionChange}
                  disabled={isImporting}
                />
                {formErrors.runtime && <p className="text-sm text-red-600">{formErrors.runtime}</p>}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="container-port"
                  className="text-sm font-medium text-zinc-900"
                  required
                >
                  {t('container_port')}
                </Label>
                <Input
                  id="container-port"
                  type="number"
                  placeholder="80"
                  value={formData.containerPort}
                  onChange={(e) => {
                    setFormData({ ...formData, containerPort: parseInt(e.target.value) || 0 });
                    if (formErrors.containerPort) {
                      setFormErrors({ ...formErrors, containerPort: undefined });
                    }
                  }}
                  disabled={isImporting}
                  className={`h-10 rounded-lg border-zinc-200 bg-white text-sm ${formErrors.containerPort ? 'border-red-500' : ''}`}
                />
                {formErrors.containerPort && (
                  <p className="text-sm text-red-600">{formErrors.containerPort}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="startup-command"
                  className="text-sm font-medium text-zinc-900"
                  required
                >
                  {t('startup_command')}
                </Label>
                <Textarea
                  id="startup-command"
                  placeholder={t('startup_command_example')}
                  value={formData.startupCommand}
                  onChange={(e) => {
                    setFormData({ ...formData, startupCommand: e.target.value });
                    if (formErrors.startupCommand) {
                      setFormErrors({ ...formErrors, startupCommand: undefined });
                    }
                  }}
                  disabled={isImporting}
                  rows={3}
                  className={`min-h-20 rounded-lg border-zinc-200 bg-white text-sm placeholder:text-zinc-500 ${formErrors.startupCommand ? 'border-red-500' : ''}`}
                />
                {formErrors.startupCommand && (
                  <p className="text-sm text-red-600">{formErrors.startupCommand}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="auto-start"
                  checked={formData.autoStart}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, autoStart: checked === true })
                  }
                  disabled={isImporting}
                />
                <Label
                  htmlFor="auto-start"
                  className="cursor-pointer text-sm font-normal text-zinc-700"
                >
                  {t('auto_start_after_import')}
                </Label>
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
              className="h-10 rounded-lg border-zinc-200 text-sm font-medium"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || !formData.file || !formData.templateUid}
              className="h-10 rounded-lg bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800"
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
