'use client';

import { toast } from 'sonner';
import { useState, useRef } from 'react';
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
import { Progress } from '@sealos/shadcn-ui/progress';
import type { GitImportFormData, ImportStage } from '@/types/import';
import { importDevboxFromGit, execCommandInDevboxPod } from '@/api/devbox';
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

  const [formData, setFormData] = useState<GitImportFormData>({
    name: '',
    gitUrl: '',
    isPrivate: false,
    templateRepositoryUid: '',
    templateUid: '',
    containerPort: 8080,
    startupCommand: ''
  });

  const [importStage, setImportStage] = useState<ImportStage>('idle');
  const [importError, setImportError] = useState<string>('');
  const [cloneProgress, setCloneProgress] = useState<number>(0);
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

  const generateDevboxName = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `devbox-${timestamp}-${random}`;
  };

  const handleImport = async () => {
    if (!formData.gitUrl || !formData.templateUid) {
      toast.error(t('please_fill_required_fields'));
      return;
    }

    if (formData.isPrivate && !formData.token) {
      toast.error(t('please_fill_git_token'));
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      setImportStage('creating');
      setImportError('');
      setCloneProgress(0);

      const devboxName = generateDevboxName();

      const response = await importDevboxFromGit({
        name: devboxName,
        gitUrl: formData.gitUrl,
        isPrivate: formData.isPrivate,
        token: formData.token,
        runtime: selectedRuntime?.iconId || '',
        templateUid: formData.templateUid,
        containerPort: formData.containerPort,
        startupCommand: formData.startupCommand,
        cpu: 4000,
        memory: 8192
      });

      setImportStage('cloning');

      const gitImportCommand = generateGitImportCommand({
        gitUrl: formData.gitUrl,
        isPrivate: formData.isPrivate,
        token: formData.token,
        startupCommand: formData.startupCommand
      });

      let commandOutput = '';
      let isSuccess = false;

      try {
        await execCommandInDevboxPod({
          devboxName: response.devboxName,
          command: gitImportCommand,
          idePath: '/home/devbox/project',
          onDownloadProgress: (progressEvent) => {
            const text = progressEvent.event.target.response;
            commandOutput = text;
            setImportLogs(text);

            if (text.includes('Git import completed successfully')) {
              isSuccess = true;
            }

            const receivingMatch = text.match(/Receiving objects:\s+(\d+)%/);
            const resolvingMatch = text.match(/Resolving deltas:\s+(\d+)%/);
            const cloningMatch = text.match(/Cloning into/);

            if (receivingMatch) {
              const progress = parseInt(receivingMatch[1]);
              setCloneProgress(Math.min(progress, 100));
            } else if (resolvingMatch) {
              const progress = parseInt(resolvingMatch[1]);
              setCloneProgress(Math.min(progress, 100));
            } else if (cloningMatch) {
              setCloneProgress(10);
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
        setTimeout(() => {
          onSuccess(response.devboxName);
        }, 1000);
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
        startupCommand: ''
      });
      setImportStage('idle');
      setImportError('');
      setCloneProgress(0);
      setImportLogs('');
      setSelectedRuntime(null);
      onClose();
    }
  };

  const isImporting =
    importStage === 'creating' ||
    importStage === 'cloning' ||
    importStage === 'configuring' ||
    importStage === 'starting';

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
                <div className="flex flex-col gap-4 rounded-xl border border-dashed border-zinc-400 bg-white p-4">
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
                              className={`text-sm ${isError ? 'text-red-600' : 'text-zinc-600'} break-all`}
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
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="git-url" className="text-sm font-medium">
                  <span className="text-red-600">*</span>
                  {t('url')}
                </Label>
                <Input
                  id="git-url"
                  placeholder={t('please_enter_git_url')}
                  value={formData.gitUrl}
                  onChange={(e) => setFormData({ ...formData, gitUrl: e.target.value })}
                  disabled={isImporting}
                  className="h-10 rounded-lg bg-white"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">
                  <span className="text-red-600">*</span>
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
                    <Label htmlFor="git-token" className="text-sm font-medium">
                      <span className="text-red-600">*</span>
                      {t('token')}
                    </Label>
                    <Input
                      id="git-token"
                      type="password"
                      placeholder={t('enter_git_token')}
                      value={formData.token || ''}
                      onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                      disabled={isImporting}
                      className="h-10 rounded-lg border-zinc-300 bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">
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

              <div className="flex flex-col gap-2">
                <Label htmlFor="container-port" className="text-sm font-medium">
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
                  className="h-10 rounded-lg bg-white"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="startup-command" className="text-sm font-medium">
                  <span className="text-red-600">*</span>
                  {t('startup_command')}
                </Label>
                <Input
                  id="startup-command"
                  placeholder={t('startup_command_example')}
                  value={formData.startupCommand}
                  onChange={(e) => setFormData({ ...formData, startupCommand: e.target.value })}
                  disabled={isImporting}
                  className="h-10 rounded-lg bg-white"
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
