'use client';

import { toast } from 'sonner';
import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Hourglass } from 'lucide-react';

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
import { RadioGroup, RadioGroupItem } from '@sealos/shadcn-ui/radio-group';
import { Textarea } from '@sealos/shadcn-ui/textarea';
import { Checkbox } from '@sealos/shadcn-ui/checkbox';
import type { GitImportFormData, ImportStage } from '@/types/import';
import { createDevbox, getDevboxByName, execCommandInDevboxPod, autostartDevbox } from '@/api/devbox';
import { getTemplate } from '@/api/template';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { generateGitImportCommand } from '@/utils/importCommandGenerator';
import RuntimeSelector from '@/components/RuntimeSelector';

interface GitImportDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (devboxName: string) => void;
}

const GitImportDrawer = ({ open, onClose, onSuccess }: GitImportDrawerProps) => {
  const t = useTranslations();
  const { getErrorMessage } = useErrorMessage();

  const controllerRef = useRef<AbortController | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<GitImportFormData>({
    name: '',
    gitUrl: '',
    isPrivate: false,
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
    gitUrl?: string;
    token?: string;
    runtime?: string;
    containerPort?: string;
    startupCommand?: string;
  }>({});

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

  const generateDevboxName = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `devbox-${timestamp}-${random}`;
  };

  const validateForm = () => {
    const errors: typeof formErrors = {};

    if (!formData.gitUrl) {
      errors.gitUrl = t('please_enter_git_url');
    }

    if (formData.isPrivate && !formData.token) {
      errors.token = t('please_fill_git_token');
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
        setImportLogs(`Waiting for devbox to be ready... (${i + 1}/${maxRetries})`);
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

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
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
        networks: [
          {
            port: formData.containerPort,
            protocol: 'HTTP',
            openPublicDomain: true
          } as any
        ],
        env: []
      });

      setImportStage('waiting');
      setImportLogs('Devbox created, waiting for it to be ready...');

      const isReady = await waitForDevboxReady(devboxName);
      if (!isReady) {
        throw new Error('Devbox failed to become ready within timeout.Please try again later.');
      }

      setImportStage('cloning');
      setImportLogs('Devbox is ready, starting git import...');

      const gitImportCommand = generateGitImportCommand({
        gitUrl: formData.gitUrl,
        isPrivate: formData.isPrivate,
        token: formData.token,
        startupCommand: formData.startupCommand
      });

      let commandOutput = '';
      let isSuccess = false;
      let lastProgress = '';

      try {
        await execCommandInDevboxPod({
          devboxName: devboxName,
          command: gitImportCommand,
          idePath: '/home/devbox/project',
          onDownloadProgress: (progressEvent) => {
            const text = progressEvent.event.target.response;
            commandOutput = text;

            const lines = text.split('\n').filter((line: string) => line.trim());
            const processedLines: string[] = [];

            for (const line of lines) {
              const progressMatch = line.match(/Receiving objects:\s+(\d+)%/);
              if (progressMatch) {
                const currentProgress = progressMatch[1];
                if (currentProgress !== lastProgress) {
                  processedLines.push(line);
                  lastProgress = currentProgress;
                }
              } else {
                processedLines.push(line);
              }
            }

            setImportLogs(processedLines.join('\n'));

            if (text.includes('Git import completed successfully')) {
              isSuccess = true;
            }
          },
          signal: controller.signal
        });
      } catch (error: any) {
        if (commandOutput.includes('Git import completed successfully')) {
          isSuccess = true;
        } else {
          console.error('Import failed:', error);
          if (!error || error === 'cancel request' || String(error).includes('cancel request')) {
            return;
          }
          setImportStage('error');
          setImportError(getErrorMessage(error, 'import_failed'));
          toast.error(getErrorMessage(error, 'import_failed'));
          return;
        }
      }

      if (isSuccess || commandOutput.includes('Git import completed successfully')) {
        setImportStage('success');
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
      } else {
        setImportStage('error');
        setImportError(t('import_failed'));
        toast.error(t('import_failed'));
      }
    } catch (error: any) {
      console.error('Import failed:', error);
      if (!error || error === 'cancel request' || String(error).includes('cancel request')) {
        return;
      }
      setImportStage('error');
      setImportError(getErrorMessage(error, 'import_failed'));
      toast.error(getErrorMessage(error, 'import_failed'));
    }
  };

  const handleClose = () => {
    if (importStage !== 'creating' && importStage !== 'cloning') {
      controllerRef.current?.abort();
      controllerRef.current = null;
      setFormData({
        name: '',
        gitUrl: '',
        isPrivate: false,
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
      onClose();
    }
  };

  const isImporting =
    importStage === 'creating' ||
    importStage === 'waiting' ||
    importStage === 'cloning' ||
    importStage === 'configuring' ||
    importStage === 'starting';

  useEffect(() => {
    if (importLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [importLogs]);

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DrawerContent className="max-w-[530px] rounded-2xl">
        <DrawerHeader className="h-14 flex-row items-center justify-between border-b px-6 py-0">
          <DrawerTitle className="text-lg font-semibold">{t('import_from_git_url')}</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-5 px-6 py-6">
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
                          log.toLowerCase().includes('fatal');

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
                    <div ref={logsEndRef} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="git-url" className="text-sm font-medium" required>
                  {t('url')}
                </Label>
                <Input
                  id="git-url"
                  placeholder={t('please_enter_git_url')}
                  value={formData.gitUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, gitUrl: e.target.value });
                    if (formErrors.gitUrl) {
                      setFormErrors({ ...formErrors, gitUrl: undefined });
                    }
                  }}
                  disabled={isImporting}
                  className={`h-10 rounded-lg bg-white ${formErrors.gitUrl ? 'border-red-500' : ''}`}
                />
                {formErrors.gitUrl && <p className="text-sm text-red-600">{formErrors.gitUrl}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium" required>
                  {t('repo_privacy')}
                </Label>
                <RadioGroup
                  value={formData.isPrivate ? 'private' : 'public'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, isPrivate: value === 'private' })
                  }
                  disabled={isImporting}
                  className="flex gap-3"
                >
                  <div
                    className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border p-3 ${
                      !formData.isPrivate ? 'border-zinc-200 bg-white' : 'border-zinc-200 bg-white'
                    }`}
                    onClick={() => !isImporting && setFormData({ ...formData, isPrivate: false })}
                  >
                    <RadioGroupItem value="public" id="public" />
                    <Label htmlFor="public" className="cursor-pointer text-sm font-medium">
                      {t('public')}
                    </Label>
                  </div>
                  <div
                    className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border p-3 ${
                      formData.isPrivate ? 'border-zinc-900' : 'border-zinc-200 bg-white'
                    }`}
                    onClick={() => !isImporting && setFormData({ ...formData, isPrivate: true })}
                  >
                    <RadioGroupItem value="private" id="private" />
                    <Label htmlFor="private" className="cursor-pointer text-sm font-medium">
                      {t('private')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.isPrivate && (
                <div className="flex flex-col gap-4 rounded-xl border border-dashed border-zinc-400 p-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="git-token" className="text-sm font-medium" required>
                      {t('token')}
                    </Label>
                    <Input
                      id="git-token"
                      type="password"
                      placeholder={t('enter_git_token')}
                      value={formData.token || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, token: e.target.value });
                        if (formErrors.token) {
                          setFormErrors({ ...formErrors, token: undefined });
                        }
                      }}
                      disabled={isImporting}
                      className={`h-10 rounded-lg border-zinc-300 bg-white ${formErrors.token ? 'border-red-500' : ''}`}
                    />
                    {formErrors.token && <p className="text-sm text-red-600">{formErrors.token}</p>}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium" required>
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

              <div className="flex flex-col gap-2">
                <Label htmlFor="container-port" className="text-sm font-medium" required>
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
                  className={`h-10 rounded-lg bg-white ${formErrors.containerPort ? 'border-red-500' : ''}`}
                />
                {formErrors.containerPort && (
                  <p className="text-sm text-red-600">{formErrors.containerPort}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="startup-command" className="text-sm font-medium" required>
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
                  className={`min-h-20 rounded-lg bg-white ${formErrors.startupCommand ? 'border-red-500' : ''}`}
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
                  className="text-sm font-normal text-zinc-700 cursor-pointer"
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
          <DrawerFooter className="flex-row justify-end gap-3 border-t px-6 py-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isImporting}
              className="h-10 rounded-lg border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || !formData.gitUrl || !formData.templateUid}
              className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
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

export default GitImportDrawer;
