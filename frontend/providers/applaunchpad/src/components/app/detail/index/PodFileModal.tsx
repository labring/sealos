import {
  kubeFile_delete,
  kubeFile_ls,
  kubeFile_mkdir,
  kubeFile_rename,
  kubeFile_upload
} from '@/api/kubeFile';
import MyIcon from '@/components/Icon';
import { useSelectFile } from '@/hooks/useSelectFile';
import { MOCK_APP_DETAIL, MOCK_PODS } from '@/mock/apps';
import { useAppStore } from '@/store/app';
import { UPLOAD_LIMIT } from '@/store/static';
import type { PodDetailType } from '@/types/app';
import { TFile } from '@/utils/kubeFileSystem';
import { formatSize, formatTime } from '@/utils/tools';
import { getUserKubeConfig } from '@/utils/user';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { MouseEvent, useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Search,
  ChevronDown,
  Home,
  Loader2,
  FolderPlus,
  Upload,
  PencilLine,
  Download,
  Trash2,
  Save,
  X,
  TriangleAlert
} from 'lucide-react';
import { Pagination } from '@sealos/shadcn-ui/pagination';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@sealos/shadcn-ui/drawer';
import { Button } from '@sealos/shadcn-ui/button';
import { Input } from '@sealos/shadcn-ui/input';
import { Switch } from '@sealos/shadcn-ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@sealos/shadcn-ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@sealos/shadcn-ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@sealos/shadcn-ui/tooltip';
import { Separator } from '@sealos/shadcn-ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@sealos/shadcn-ui/breadcrumb';
import { Popover, PopoverContent, PopoverTrigger } from '@sealos/shadcn-ui/popover';
import { Label } from '@sealos/shadcn-ui/label';

const PodFile = ({
  isOpen,
  onClose,
  pod: podDetail = MOCK_PODS[0],
  pods = [],
  podAlias = '',
  setPodDetail
}: {
  isOpen: boolean;
  onClose: () => void;
  pod: PodDetailType;
  pods: { alias: string; podName: string }[];
  podAlias: string;
  setPodDetail: (name: string) => void;
}) => {
  const { t } = useTranslation();
  const { appDetail = MOCK_APP_DETAIL } = useAppStore();
  const [storeDetail, setStoreDetail] = useState<{
    name: string;
    path: string;
    value: number;
  }>(appDetail.storeList[0] || { name: '/', path: '/', value: 10 });

  const [fileProgress, setFileProgress] = useState<number>(0);
  const [appName, setAppName] = useState(appDetail.appName);
  const [basePath, setBasePath] = useState(storeDetail?.path || '/');
  const basePathArray = useMemo(() => basePath?.split('/')?.filter(Boolean), [basePath]);
  const [newFileName, setNewFileName] = useState('');
  const [currentFile, setCurrentFile] = useState<TFile>();
  const [showHidden, setShowHidden] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isUploadLoading, setIsUploadLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isEditingPageSize, setIsEditingPageSize] = useState(false);
  const [editingPageSizeValue, setEditingPageSizeValue] = useState('10');
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editingFileName, setEditingFileName] = useState('');
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [deletePopoverOpen, setDeletePopoverOpen] = useState<string | null>(null);

  const { File, onOpen: openUploadFile } = useSelectFile({
    fileType: '*',
    multiple: true
  });

  const { data, refetch } = useQuery(
    ['KubeFileSystem-ls', basePath, showHidden, podDetail.podName, appName],
    () =>
      kubeFile_ls({
        containerName: appName,
        podName: podDetail.podName,
        path: basePath,
        showHidden: showHidden
      }),
    {
      enabled: !!basePath
    }
  );

  const sortData = useMemo(() => {
    if (!data) return null;
    const resultData = data.directories.concat(data.files);
    if (!searchValue.trim()) {
      return resultData;
    }
    return resultData.filter((item) => item.name.toLowerCase().includes(searchValue.toLowerCase()));
  }, [data, searchValue]);

  // Pagination
  const totalPages = useMemo(() => {
    if (!sortData) return 0;
    return Math.ceil(sortData.length / pageSize);
  }, [sortData, pageSize]);

  const paginatedData = useMemo(() => {
    if (!sortData) return null;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortData.slice(startIndex, endIndex);
  }, [sortData, currentPage, pageSize]);

  // Reset to page 1 when search or path changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, basePath]);

  // Handle pageSize edit
  const handlePageSizeStartEdit = () => {
    setIsEditingPageSize(true);
    setEditingPageSizeValue(pageSize.toString());
  };

  const handlePageSizeSave = () => {
    const newPageSize = parseInt(editingPageSizeValue, 10);
    if (newPageSize > 0 && newPageSize <= 100) {
      setPageSize(newPageSize);
      setCurrentPage(1); // Reset to first page when page size changes
    }
    setIsEditingPageSize(false);
  };

  const handlePageSizeCancel = () => {
    setIsEditingPageSize(false);
    setEditingPageSizeValue(pageSize.toString());
  };

  // File icon system with color mapping
  const getFileIcon = (file: TFile): { name: string; color: string } => {
    const kind = file.kind;
    const name = file.name;

    // Folder
    if (kind === 'd') {
      return { name: 'folderColor', color: '#EAB308' };
    }

    // File extension mapping
    const fileExtension = name.split('.').pop()?.toLowerCase() || '';

    // Icon and color mapping
    const iconMap: Record<string, { name: string; color: string }> = {
      // Documents
      csv: { name: 'csvColor', color: '#16A34A' },
      pdf: { name: 'pdfColor', color: '#DC2626' },
      txt: { name: 'txtColor', color: '#71717A' },

      // Images
      png: { name: 'pngColor', color: '#0D9488' },
      jpg: { name: 'pngColor', color: '#0D9488' },
      jpeg: { name: 'pngColor', color: '#0D9488' },
      gif: { name: 'pngColor', color: '#0D9488' },
      svg: { name: 'pngColor', color: '#0D9488' },
      webp: { name: 'pngColor', color: '#0D9488' },
      ico: { name: 'pngColor', color: '#0D9488' },

      // Config files
      yaml: { name: 'yamlColor', color: '#8B5CF6' },
      yml: { name: 'yamlColor', color: '#8B5CF6' },
      json: { name: 'yamlColor', color: '#8B5CF6' },
      toml: { name: 'yamlColor', color: '#8B5CF6' },
      ini: { name: 'yamlColor', color: '#8B5CF6' },
      conf: { name: 'yamlColor', color: '#8B5CF6' },
      config: { name: 'yamlColor', color: '#8B5CF6' },

      // Web files
      html: { name: 'html2Color', color: '#71717A' },
      htm: { name: 'html2Color', color: '#71717A' },
      css: { name: 'html2Color', color: '#71717A' },
      scss: { name: 'html2Color', color: '#71717A' },
      sass: { name: 'html2Color', color: '#71717A' },
      less: { name: 'html2Color', color: '#71717A' },

      // Code files
      js: { name: 'txtColor', color: '#71717A' },
      jsx: { name: 'txtColor', color: '#71717A' },
      ts: { name: 'txtColor', color: '#71717A' },
      tsx: { name: 'txtColor', color: '#71717A' },
      py: { name: 'txtColor', color: '#71717A' },
      go: { name: 'txtColor', color: '#71717A' },
      java: { name: 'txtColor', color: '#71717A' },
      c: { name: 'txtColor', color: '#71717A' },
      cpp: { name: 'txtColor', color: '#71717A' },
      h: { name: 'txtColor', color: '#71717A' },
      hpp: { name: 'txtColor', color: '#71717A' },
      rs: { name: 'txtColor', color: '#71717A' },
      php: { name: 'txtColor', color: '#71717A' },
      rb: { name: 'txtColor', color: '#71717A' },
      sh: { name: 'txtColor', color: '#71717A' },
      bash: { name: 'txtColor', color: '#71717A' },

      // Data files
      xml: { name: 'txtColor', color: '#71717A' },
      sql: { name: 'txtColor', color: '#71717A' },
      md: { name: 'txtColor', color: '#71717A' },
      markdown: { name: 'txtColor', color: '#71717A' },
      log: { name: 'txtColor', color: '#71717A' }
    };

    return iconMap[fileExtension] || { name: 'defaultColor', color: '#2563EB' };
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === basePathArray.length - 1) {
      return;
    }
    const newPath = `/${basePathArray.slice(0, index + 1).join('/')}`;
    setBasePath(newPath);
  };

  const handleDelete = async (file: TFile) => {
    try {
      await kubeFile_delete({
        podName: podDetail.podName,
        containerName: appName,
        path: file.path
      });
      toast.success(t('Delete Success') || 'success');
      refetch();
    } catch (error) {
      toast.error(t('Delete Failed') || 'Delete failed');
    }
    setDeletePopoverOpen(null);
  };

  const handleRename = async (file: TFile, newName: string) => {
    try {
      if (!file || !newName || newName === file.name) return;
      const from = file.path;
      const to = file.path.replace(/\/[^/]+$/, `/${newName}`);
      await kubeFile_rename({
        podName: podDetail.podName,
        containerName: appName,
        from,
        to
      });
      toast.success(t('Rename Success'));
      refetch();
    } catch (error) {
      toast.error(t('Rename Failed'));
    }
  };

  const handleStartEdit = (file: TFile) => {
    setEditingFile(file.path);
    setEditingFileName(file.name);
  };

  const handleSaveEdit = async (file: TFile) => {
    if (editingFileName && editingFileName !== file.name) {
      await handleRename(file, editingFileName);
    }
    setEditingFile(null);
    setEditingFileName('');
  };

  const handleCancelEdit = () => {
    setEditingFile(null);
    setEditingFileName('');
  };

  const handleDownload = async (e: MouseEvent<HTMLButtonElement>, file: TFile) => {
    try {
      e.stopPropagation();
      setCurrentFile(file);
      if (!file) return;
      const res = await fetch('/api/kubeFileSystem/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: encodeURIComponent(getUserKubeConfig())
        },
        body: JSON.stringify({
          podName: podDetail.podName,
          containerName: appName,
          path: file.path
        })
      });

      if (res.ok) {
        const cloneRes = res.clone();
        const contentLength = file.size;

        let downloaded = 0;
        const reader = res.body?.getReader();
        if (!reader) return;
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            setFileProgress(100);
            break;
          }
          downloaded += value.length;
          const progress = Math.round((downloaded / contentLength) * 100);
          setFileProgress(progress);
        }

        const blob = await cloneRes.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', file.name);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error: any) {}
  };

  const uploadFile = async (files: File[]) => {
    setIsUploadLoading(true);
    try {
      const filteredFiles = files.filter((file) => {
        if (file.size > UPLOAD_LIMIT * 1024 * 1024) {
          toast.info(t('File is too large tip', { name: file.name }));
          return false;
        }
        return true;
      });
      const uploadPromises = filteredFiles.map(async (file) => {
        const name = file.name;
        const form = new FormData();
        form.append('file', file, encodeURIComponent(file.name));
        return await kubeFile_upload(
          {
            podName: podDetail.podName,
            containerName: appName,
            path: `${basePath}/${name}`
          },
          form
        );
      });
      await Promise.all(uploadPromises);
      refetch();
    } catch (error) {
      refetch();
    }
    setIsUploadLoading(false);
  };

  const createFolder = async () => {
    try {
      if (!newFileName) return;
      await kubeFile_mkdir({
        podName: podDetail.podName,
        containerName: appName,
        path: `${basePath}/${newFileName}`
      });
      toast.success('success');
    } catch (error) {}
  };

  const handleCreateFolderConfirm = async () => {
    try {
      if (!folderName.trim()) return;
      await kubeFile_mkdir({
        podName: podDetail.podName,
        containerName: appName,
        path: `${basePath}/${folderName}`
      });
      toast.success(t('Create Folder Success') || 'success');
      setFolderName('');
      setIsCreateFolderOpen(false);
      refetch();
    } catch (error) {
      toast.error(t('Create Folder Failed') || 'failed');
    }
  };

  return (
    <>
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent direction="right" className="min-w-[1265px] overflow-hidden">
          <DrawerHeader className="px-6 py-3">
            <div className="flex items-center gap-4">
              <DrawerTitle className="text-lg font-semibold">{t('File Management')}</DrawerTitle>
              <Select value={podDetail.podName} onValueChange={setPodDetail}>
                <SelectTrigger className="min-w-[240px] !h-9 border-zinc-200 rounded-lg text-sm font-normal">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">{t('Pod')}</span>
                    <Separator orientation="vertical" className="!h-3 bg-zinc-300" />
                    <SelectValue placeholder={podAlias} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {pods.map((item) => (
                    <SelectItem key={item.podName} value={item.podName}>
                      {item.alias}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {storeDetail && (
                <Select
                  value={storeDetail.name}
                  onValueChange={(name) => {
                    const item = appDetail.storeList.find((i) => i.name === name);
                    if (item) {
                      setBasePath(item.path);
                      setStoreDetail(item);
                    }
                  }}
                >
                  <SelectTrigger className="min-w-[240px] !h-9 border-zinc-200 rounded-lg text-sm font-normal">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">{t('Storage')}</span>
                      <Separator orientation="vertical" className="!h-3 bg-zinc-300" />
                      <SelectValue placeholder={storeDetail?.path} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {appDetail.storeList.map((item) => (
                      <SelectItem key={item.name} value={item.name}>
                        {item.path}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </DrawerHeader>

          <div className="flex-1 min-h-0 flex flex-col px-6 pt-6 pb-[60px]">
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Breadcrumb */}
              <Breadcrumb className="mb-5 shrink-0">
                <BreadcrumbList>
                  {basePathArray.map((p, index, arr) => (
                    <BreadcrumbItem key={p}>
                      {index === arr.length - 1 ? (
                        <BreadcrumbPage className="text-sm font-normal text-zinc-900 flex items-center gap-2">
                          {p}
                        </BreadcrumbPage>
                      ) : (
                        <>
                          <BreadcrumbLink
                            className="text-sm font-normal text-zinc-500 hover:text-zinc-900 cursor-pointer flex items-center gap-2"
                            onClick={() => handleBreadcrumbClick(index)}
                          >
                            {p}
                          </BreadcrumbLink>
                          <BreadcrumbSeparator className="text-zinc-500 [&>svg]:size-5" />
                        </>
                      )}
                    </BreadcrumbItem>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>

              {/* Header */}
              <div className="h-8 flex text-sm items-center mb-4 relative shrink-0">
                <File onSelect={(e) => uploadFile(e)} />
                <div className="relative w-[250px] mr-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 z-10" />
                  <Input
                    className="pl-9 text-sm py-[10px] border-zinc-200 rounded-lg bg-zinc-100"
                    placeholder={t('filename') || 'filename'}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                  />
                </div>
                <Switch checked={showHidden} onCheckedChange={setShowHidden} className="mr-2" />
                <span className="text-sm font-normal text-zinc-900">{t('show hidden files')}</span>
                <div className="ml-auto flex gap-3">
                  <Popover open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 rounded-lg">
                        <FolderPlus className="w-4 h-4 mr-1 text-neutral-500" />
                        {t('Create Folder')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[400px] p-6 bg-white rounded-3xl border border-white shadow-[0_2px_10px_0_rgba(19,51,107,0.20),0_0_1px_0_rgba(19,51,107,0.10)]"
                      align="end"
                      side="top"
                      sideOffset={8}
                      arrowPadding={24}
                      showArrow
                    >
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-zinc-900 leading-none">
                          {t('Create Folder')}
                        </h3>
                        <div className="space-y-2">
                          <Label
                            htmlFor="folder-name"
                            className="text-sm font-medium text-zinc-700"
                          >
                            <span className="text-red-500">*</span>
                            {t('Folder Name')}
                          </Label>
                          <Input
                            id="folder-name"
                            value={folderName}
                            onChange={(e) => setFolderName(e.target.value)}
                            placeholder={
                              t('Please enter the folder name') || 'Please enter the folder name'
                            }
                            className="h-10"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCreateFolderConfirm();
                              }
                            }}
                          />
                        </div>
                        <div className="flex justify-end gap-3">
                          <Button
                            variant="outline"
                            className="w-[80px] h-10"
                            onClick={() => {
                              setFolderName('');
                              setIsCreateFolderOpen(false);
                            }}
                          >
                            {t('Cancel')}
                          </Button>
                          <Button
                            className="w-[80px] h-10 bg-neutral-950"
                            onClick={handleCreateFolderConfirm}
                            disabled={!folderName.trim()}
                          >
                            {t('Confirm')}
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="outline"
                    className="h-9 rounded-lg"
                    disabled={isUploadLoading}
                    onClick={openUploadFile}
                  >
                    {isUploadLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1 text-neutral-500" />
                    ) : (
                      <Upload className="w-4 h-4 mr-1 text-neutral-500" />
                    )}
                    {t('upload')}
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 min-h-0 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="rounded-xl border border-zinc-200 bg-white mb-6">
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow className="">
                        <TableHead className="text-zinc-500 bg-white border-b border-zinc-200 py-3 pl-5 w-[30%] !rounded-tl-xl">
                          {t('File Name')}
                        </TableHead>
                        <TableHead className="text-zinc-500 bg-white border-b border-zinc-200 py-3 w-[15%]">
                          {t('Attribute')}
                        </TableHead>
                        <TableHead className="text-zinc-500 bg-white border-b border-zinc-200 py-3 w-[15%]">
                          {t('Owner')} : {t('Group')}
                        </TableHead>
                        <TableHead className="text-zinc-500 bg-white border-b border-zinc-200 py-3 w-[10%]">
                          {t('Size')}
                        </TableHead>
                        <TableHead className="text-zinc-500 bg-white border-b border-zinc-200 py-3 w-[20%]">
                          {t('Update Time')}
                        </TableHead>
                        <TableHead className="text-zinc-500 bg-white border-b border-zinc-200 py-3 pr-5 w-[10%] !rounded-tr-xl">
                          {' '}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData?.map((item) => (
                        <TableRow
                          key={item.name}
                          className="cursor-pointer hover:bg-zinc-50 border-b border-zinc-200"
                          onClick={() => {
                            if (item.kind === 'd') {
                              setBasePath(item.path);
                            }
                          }}
                        >
                          <TableCell className="text-zinc-900 font-medium py-0 h-full pl-5">
                            <div className="group/name-column flex items-center h-full gap-2">
                              {(() => {
                                const iconInfo = getFileIcon(item);
                                return (
                                  <MyIcon
                                    name={iconInfo.name as any}
                                    width={'24px'}
                                    height={'24px'}
                                    color={iconInfo.color}
                                  />
                                );
                              })()}
                              {editingFile === item.path ? (
                                <div
                                  className="flex items-center gap-3"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Input
                                    value={editingFileName}
                                    onChange={(e) => setEditingFileName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveEdit(item);
                                      } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        handleCancelEdit();
                                      }
                                    }}
                                    autoFocus
                                    className="h-9 text-sm flex-1 bg-white"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div className="flex items-center">
                                    <Button
                                      variant="ghost"
                                      className="h-9 w-9 shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSaveEdit(item);
                                      }}
                                    >
                                      <Save className="w-6 h-6 text-zinc-500" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      className="h-9 w-9 shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancelEdit();
                                      }}
                                    >
                                      <X className="w-6 h-6 text-zinc-500" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <span className="truncate">{item.name}</span>
                                  <PencilLine
                                    className="w-4 h-4 text-zinc-500 cursor-pointer opacity-0 shrink-0 group-hover/name-column:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEdit(item);
                                    }}
                                  />
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-zinc-500 py-2">{item.attr}</TableCell>
                          <TableCell className="text-zinc-500 py-2">
                            {item.owner}:{item.group}
                          </TableCell>
                          <TableCell className="text-zinc-500 py-2">
                            {formatSize(item.size)}
                          </TableCell>
                          <TableCell className="text-zinc-500 py-2">
                            {formatTime(item.updateTime, 'YYYY-MM-DD HH:mm')}
                          </TableCell>
                          <TableCell className="py-2 pr-5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center">
                              {item.kind !== 'd' && (
                                <>
                                  {fileProgress > 0 &&
                                  fileProgress < 100 &&
                                  currentFile?.path === item.path ? (
                                    <div className="w-8 h-8 flex items-center justify-center">
                                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                    </div>
                                  ) : (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-9 w-9"
                                          onClick={(e) => handleDownload(e, item)}
                                        >
                                          <Download className="w-4 h-4 text-zinc-500" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>{t('download')}</TooltipContent>
                                    </Tooltip>
                                  )}
                                </>
                              )}
                              <Popover
                                open={deletePopoverOpen === item.path}
                                onOpenChange={(open) =>
                                  setDeletePopoverOpen(open ? item.path : null)
                                }
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className={`h-9 w-9 hover:text-destructive ${
                                      deletePopoverOpen === item.path
                                        ? 'text-destructive'
                                        : 'text-zinc-500'
                                    }`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-[400px] p-6 bg-white rounded-3xl border border-white shadow-[0_2px_10px_0_rgba(19,51,107,0.20),0_0_1px_0_rgba(19,51,107,0.10)]"
                                  align="end"
                                  side="top"
                                  sideOffset={2}
                                  arrowPadding={24}
                                  showArrow
                                >
                                  <div className="space-y-4">
                                    <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 leading-none">
                                      <TriangleAlert className="h-4 w-4 text-yellow-600" />
                                      {t('Delete')}
                                    </h3>
                                    <p className="text-sm font-medium text-zinc-900">
                                      {t('Are you sure you want to delete the file or folder?')}
                                    </p>
                                    <div className="flex justify-end gap-3">
                                      <Button
                                        variant="outline"
                                        className="w-[80px] h-10"
                                        onClick={() => setDeletePopoverOpen(null)}
                                      >
                                        {t('Cancel')}
                                      </Button>
                                      <Button
                                        variant="outline"
                                        className="w-[80px] h-10 text-destructive shadow-none"
                                        onClick={() => handleDelete(item)}
                                      >
                                        {t('Delete')}
                                      </Button>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>

          {/* Pagination*/}
          {sortData && sortData.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between bg-white px-5 py-3 text-sm text-zinc-500 border-t border-zinc-200">
              <span>{t('Total') + ': ' + sortData.length}</span>
              <div className="flex items-center gap-3">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
                <div className="flex items-center gap-1">
                  {isEditingPageSize ? (
                    <Input
                      value={editingPageSizeValue}
                      onChange={(e) => setEditingPageSizeValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handlePageSizeSave();
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          handlePageSizeCancel();
                        }
                      }}
                      onBlur={handlePageSizeSave}
                      autoFocus
                      className="h-7 w-12 text-center text-sm p-0"
                      type="number"
                      min="1"
                      max="100"
                    />
                  ) : (
                    <span
                      className="text-zinc-900 cursor-pointer hover:text-zinc-700"
                      onClick={handlePageSizeStartEdit}
                    >
                      {pageSize}
                    </span>
                  )}
                  <span>/</span>
                  <span>{t('Page')}</span>
                </div>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default PodFile;
