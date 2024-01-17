import { deleteObject, listObjects } from '@/api/s3';
import { Authority, FolderPlaceholder, QueryKey } from '@/consts';
import { useOssStore } from '@/store/ossStore';
import {
  AbsoluteCenter,
  Button,
  ButtonGroup,
  Center,
  Checkbox,
  Flex,
  FlexProps,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import PathLink from './PathLink';
import SearchIcon from '../Icons/SearchIcon';
import UploadModal from '../common/modal/UploadModal';
import CreateFolderModal from '../common/modal/CreateFolderModal';
import RefreshIcon from '../Icons/RefreshIcon';
import VisibityIcon from '../Icons/VisibilityIcon';
import LinkIcon from '../Icons/LinkIcon';
import FileIcon from '../Icons/FileIcon';
import FolderIcon from '../Icons/FolderIcon';
import SortButton from './SortButton';
import { GetObjectCommand, S3 } from '@aws-sdk/client-s3';
import { useToast } from '@/hooks/useToast';
import { useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';
import ArrowDownSLineIcon from '../Icons/ArrowDownSLineIcon';
import { formatBytes, useCopyData } from '@/utils/tools';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { format } from 'date-fns';
import DeleteFileModal from '../common/modal/DeleteFileModal';
import DeleteSingleFileModal from '../common/modal/DeleteSingleFileModal';
import StorageIcon from '../Icons/StorageIcon';
import useSessionStore from '@/store/session';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  getFilteredRowModel
} from '@tanstack/react-table';

type EntryType = {
  LastModified?: Date;
  fileName: string;
  Key: string;
  Size?: number;
  type: string;
  isDir: boolean;
};

export enum TableHeaderID {
  'select' = 'select',
  'fileName' = 'fileName',
  'fileSize' = 'fileSize',
  'modifiedTime' = 'modifiedTime',
  'fileType' = 'fileType',
  'action' = 'action'
}
export default function FileManager({ ...styles }: FlexProps) {
  const { t } = useTranslation('file');
  const { t: commonT } = useTranslation('common');
  const { t: toolsT } = useTranslation('tools');
  const bucket = useOssStore((s) => s.currentBucket);
  const s3client = useOssStore((s) => s.client);
  const session = useSessionStore((s) => s.session);
  const Bucket = bucket?.name || '';
  const prefix = useOssStore((s) => s.prefix);
  const Prefix = prefix.length === 0 ? '' : [...prefix, ''].join('/');
  const [pageStack, setpageStack] = useState<string[]>([]);
  const [ContinuationToken, setContinuationToken] = useState<string | undefined>(undefined);
  const [MaxKeys, setMaxKeys] = useState(20);
  const { toast } = useToast();
  const setPrefix = useOssStore((s) => s.setPrefix);
  const queryClient = useQueryClient();
  // search
  const [searchVal, setSearchVal] = useState('');
  const [, startTransition] = useTransition();
  // sort
  const clearPage = () => {
    setpageStack([]);
    setContinuationToken(undefined);
  };

  const { copyData } = useCopyData();
  const objectsQuery = useQuery({
    queryKey: [
      QueryKey.minioFileList,
      { Bucket, Prefix, MaxKeys, ContinuationToken, s3client, session }
    ],
    queryFn: () =>
      listObjects(s3client!)({ Bucket, Prefix, Delimiter: '/', ContinuationToken, MaxKeys }),
    select(data) {
      return data;
    },
    enabled: !!s3client && !!Bucket
  });
  useEffect(() => {
    if (objectsQuery.isError) {
      // @ts-ignore
      toast({ title: objectsQuery.failureReason?.message, status: 'error' });
    } else if (objectsQuery.data?.IsTruncated) {
      const data = objectsQuery.data;
      const token = data.NextContinuationToken;
      if (!!token && !pageStack.includes(token)) {
        // set new page
        setpageStack((pageStack) => [...pageStack, token]);
      }
    }
  }, [objectsQuery.data, objectsQuery.isError]);
  // clear delete items
  useEffect(() => {
    table.toggleAllRowsSelected(false);
  }, [bucket, prefix, pageStack, ContinuationToken]);
  const deleteMutation = useMutation({
    mutationFn: deleteObject(s3client!),
    onSuccess() {
      toast({
        status: 'success',
        title: 'delete successfully'
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKey.minioFileList],
        exact: false
      });
    },
    onError(data: { message: string }) {
      toast({
        status: 'error',
        title: data.message
      });
    }
  });
  const deleteEntry = (file: EntryType) => {
    if (!s3client || !bucket?.name) return;
    if (!file.isDir) {
      deleteMutation.mutate({
        Bucket: bucket.name,
        Delete: {
          Objects: [
            {
              Key: file.Key
            }
          ]
        }
      });
    } else {
      listObjects(s3client)({
        Prefix: file.Key,
        Bucket: bucket.name
      }).then((val) => {
        deleteMutation.mutate({
          Bucket: bucket.name,
          Delete: {
            Objects: val.Contents?.map((obj) => ({ Key: obj.Key }))
          }
        });
      });
    }
  };
  const fileList: EntryType[] = useMemo(
    () => [
      ...(objectsQuery.data?.Contents?.flatMap((_file) => {
        const relativePath =
          _file.Key?.replace(Prefix, '')
            .split('/')
            .filter((v) => v.trim() !== '') || [];
        if (relativePath.length === 0) return [];
        const fileName = relativePath[0];
        if (fileName === FolderPlaceholder) return [];
        const fileNameArr = fileName.split('.');
        return [
          {
            LastModified: _file.LastModified,
            fileName,
            Key: _file.Key!,
            Size: _file.Size!,
            type: fileNameArr.length > 1 ? fileNameArr.pop()! : 'plain',
            isDir: false
          }
        ];
      }) || []),
      ...(objectsQuery.data?.CommonPrefixes?.map((v) => ({
        LastModified: undefined,
        Size: 0,
        Key: v.Prefix || '/',
        fileName: v.Prefix?.split('/')
          .filter((v) => v.trim() !== '')
          .pop()!,
        type: 'folder',
        isDir: true
      })) || [])
    ],
    [objectsQuery.data]
  );
  // get url
  const generateUrl = async (client: S3, Bucket: string, Key: string) => {
    if (bucket?.policy === Authority.private) {
      return getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket,
          Key
        })
      );
    } else {
      const ep = await client.config.endpoint!();
      const { protocol, hostname, path } = ep;
      const url = `${protocol}//${hostname}${path}${Bucket}/${Key}`;
      return url;
    }
  };
  // budle delete

  const multiDeleteEntry = async (_keyList: string[]) => {
    if (!s3client || !bucket?.name) return;
    const objs = fileList.filter((file) => _keyList.includes(file.Key) && file.type !== 'link');
    const fileObjs = objs.filter((v) => !v.isDir).map((v) => ({ Key: v.Key }));
    const folderObjs = objs.filter((v) => v.isDir);
    if (folderObjs.length > 0) {
      for (let i = 0; i < folderObjs.length; i++) {
        const folder = folderObjs[i];
        const res = await listObjects(s3client)({
          Prefix: folder.Key,
          Bucket: bucket.name
        });
        // inset key
        fileObjs.push(
          ...(res.Contents?.flatMap((v) => {
            if (v.Key) {
              return [{ Key: v.Key }];
            } else {
              return [];
            }
          }) || [])
        );
      }
    }
    await deleteMutation.mutateAsync({
      Bucket: bucket.name,
      Delete: {
        Objects: fileObjs
      }
    });
  };
  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<EntryType>();
    return [
      columnHelper.display({
        enablePinning: true,
        id: TableHeaderID.select,
        header({ table }) {
          return (
            <Center onClick={(e) => e.stopPropagation()}>
              <Checkbox
                isChecked={table.getIsAllRowsSelected()}
                onChange={table.getToggleAllRowsSelectedHandler()}
                isIndeterminate={!table.getIsAllRowsSelected() && table.getIsSomeRowsSelected()}
              />
            </Center>
          );
        },
        cell({ row }) {
          return (
            <Center onClick={(e) => e.stopPropagation()}>
              <Checkbox
                isDisabled={!row.getCanSelect()}
                isChecked={row.getIsSelected()}
                onChange={row.getToggleSelectedHandler()}
              />
            </Center>
          );
        }
      }),
      columnHelper.accessor((row) => row.fileName, {
        header({ column }) {
          return (
            <SortButton
              onClick={column.getToggleSortingHandler()}
              state={column.getIsSorted()}
              nextState={column.getNextSortingOrder()}
            >
              {t('fileName')}
            </SortButton>
          );
        },
        id: TableHeaderID.fileName,
        enablePinning: true,
        sortDescFirst: true,
        cell(props) {
          const file = props.row.original;
          return (
            <HStack gap="10px">
              {file.isDir ? (
                <FolderIcon boxSize={'20px'} color="blue.600" />
              ) : (
                <FileIcon boxSize={'20px'} color="purple.500" />
              )}
              <Tooltip
                hasArrow
                label={file.fileName}
                placement="top"
                bg={'white'}
                color={'black'}
                py="8px"
                px="10.5px"
                fontSize={'12px'}
                borderRadius={'4px'}
              >
                <Text
                  width={'180px'}
                  whiteSpace="nowrap"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  color="grayModern.900"
                >
                  {file.fileName}
                </Text>
              </Tooltip>
            </HStack>
          );
        },
        sortingFn: 'textCaseSensitive'
      }),
      columnHelper.accessor((row) => row.Size, {
        header({ column }) {
          return (
            <SortButton
              state={column.getIsSorted()}
              nextState={column.getNextSortingOrder()}
              onClick={column.getToggleSortingHandler()}
            >
              {t('fileSize')}
            </SortButton>
          );
        },
        id: TableHeaderID.fileSize,
        enablePinning: true,
        cell(props) {
          const file = props.row.original;
          return (
            <Text color={'grayModern.600'}>
              {file.isDir ? '--' : formatBytes(file.Size || 0).toString()}
            </Text>
          );
        },
        sortingFn(row1, row2, id) {
          const size1 = row1.getValue<number | undefined>(id);
          const size2 = row2.getValue<number | undefined>(id);
          if (size2 === void 0) {
            return 1;
          } else if (size1 === void 0) {
            return -1;
          } else {
            return size1 > size2 ? 1 : size2 > size1 ? -1 : 0;
          }
        }
      }),
      columnHelper.accessor((row) => row.type, {
        header({ column }) {
          return (
            <SortButton
              state={column.getIsSorted()}
              onClick={column.getToggleSortingHandler()}
              nextState={column.getNextSortingOrder()}
            >
              {t('fileType')}
            </SortButton>
          );
        },
        cell({ cell }) {
          return <Text color={'grayModern.600'}>{cell.getValue()}</Text>;
        },
        id: TableHeaderID.fileType,
        enablePinning: true,
        sortingFn: 'text'
      }),
      columnHelper.accessor((row) => row.LastModified, {
        header(props) {
          return (
            <SortButton
              state={props.column.getIsSorted()}
              nextState={props.column.getNextSortingOrder()}
              onClick={props.column.getToggleSortingHandler()}
            >
              {t('modifiedTime')}
            </SortButton>
          );
        },
        id: TableHeaderID.modifiedTime,
        cell(props) {
          const dateVal = props.cell.getValue();
          return (
            <Text color={'grayModern.600'}>
              {dateVal ? format(dateVal, 'yyyy/MM/dd hh:mm') : ''}
            </Text>
          );
        },
        sortingFn: 'datetime'
      }),
      columnHelper.display({
        header() {
          return t('action');
        },
        id: TableHeaderID.action,
        enablePinning: true,
        cell(props) {
          const file = props.row.original;
          return (
            <ButtonGroup variant={'white-bg-icon'} color={'grayModern.900'}>
              {!file.isDir && (
                <IconButton
                  icon={<VisibityIcon boxSize={'14px'} />}
                  p="5px"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!s3client || !Bucket) return;
                    generateUrl(s3client, Bucket, file.Key)
                      .then((url) => {
                        window.open(new URL(url));
                      })
                      .catch(() => {
                        toast({
                          status: 'error',
                          title: 'get url error'
                        });
                      });
                  }}
                  aria-label={'preview'}
                />
              )}
              {!file.isDir && (
                <IconButton
                  icon={<LinkIcon boxSize={'14px'} />}
                  p="5px"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!s3client || !Bucket) return;
                    generateUrl(s3client, Bucket, file.Key)
                      .then((url) => {
                        copyData(url);
                      })
                      .catch((err) => {
                        toast({
                          status: 'error',
                          title: 'get url error'
                        });
                      });
                  }}
                  aria-label={'link'}
                />
              )}
              {!(file.isDir && file.type === 'link') && (
                <DeleteSingleFileModal
                  aria-label={'delete'}
                  onDelete={() => {
                    deleteEntry(file);
                  }}
                />
              )}
            </ButtonGroup>
          );
        }
      })
    ];
  }, [t, Bucket, s3client]);
  const table = useReactTable<EntryType>({
    data: fileList,
    state: {
      columnPinning: {
        left: [TableHeaderID.select, TableHeaderID.fileName],
        right: [TableHeaderID.action]
      }
    },
    enableRowSelection(row) {
      const file = row.original;
      return !(file.type === 'link' && file.isDir);
    },
    enableSorting: true,
    enableColumnPinning: true,
    columns,
    getSortedRowModel: getSortedRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    debugTable: false
  });
  return (
    <Flex direction={'column'} {...styles}>
      <HStack w="full" my="16px" mb="25px">
        <PathLink />
        <InputGroup variant={'secondary'} alignItems={'center'} size={'sm'}>
          <InputLeftElement>
            <SearchIcon boxSize={'16px'} color="grayModern.600" />
          </InputLeftElement>
          <Input
            fontSize="14px"
            type="text"
            maxW="270px"
            placeholder={t('searchFile')}
            onChange={(v) => {
              const val = v.target.value.trim();
              setSearchVal(val);
              startTransition(() => {
                table.getColumn(TableHeaderID.fileName)?.setFilterValue(val);
              });
            }}
            value={searchVal}
          />
        </InputGroup>
        <ButtonGroup
          variant={'white-bg-icon'}
          gap={['0', null, null, null, '16px']}
          ml="auto"
          mr="12px"
          isDisabled={objectsQuery.isError}
          color="grayModern.500"
        >
          <UploadModal />
          <CreateFolderModal />
          <DeleteFileModal
            onDelete={() => {
              multiDeleteEntry(table.getSelectedRowModel().rows.map((v) => v.original.Key));
            }}
            fileListLength={table.getSelectedRowModel().rows.length}
          />
          <Button
            display={'flex'}
            gap="8px"
            onClick={() => {
              table.toggleAllRowsSelected(false);
              queryClient.invalidateQueries({ queryKey: [QueryKey.minioFileList] }).then(() => {
                toast({
                  status: 'success',
                  title: 'refresh successfully'
                });
              });
            }}
          >
            <RefreshIcon boxSize={'24px'} color="grayModern.500" />
            <Text color={'grayModern.900'} display={['none', null, null, null, 'initial']}>
              {commonT('refresh')}
            </Text>
          </Button>
        </ButtonGroup>
      </HStack>
      {deleteMutation.isLoading || objectsQuery.isLoading ? (
        <Center w="full" h="full">
          <Spinner size={'xl'} />
        </Center>
      ) : (
        <TableContainer
          overflowY={'auto'}
          h="0"
          flex={'auto'}
          sx={{
            th: {
              px: '4px',
              py: '7px'
            },
            td: {
              px: '4px',
              py: '7px',
              fontSize: '12px'
            }
          }}
          position={'relative'}
        >
          <Table variant="simple">
            <Thead>
              {table.getHeaderGroups().map((group) => {
                return (
                  <Tr
                    bgColor={'white_.500'}
                    zIndex={10}
                    key={group.id}
                    position={'sticky'}
                    top={'0'}
                  >
                    {group.headers.map((header) => (
                      <Th
                        {...(header.column.getIsPinned()
                          ? {
                              [header.column.getIsPinned() as string]:
                                24 * header.column.getPinnedIndex() + 'px',
                              pos: 'sticky',
                              zIndex: 2
                            }
                          : {})}
                        bgColor={'inherit'}
                        w={header.column.id === TableHeaderID.select ? '24px' : 'initial'}
                        color={'grayModern.600'}
                        isNumeric={[TableHeaderID.action].includes(header.id as TableHeaderID)}
                        key={header.id}
                        colSpan={header.colSpan}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </Th>
                    ))}
                  </Tr>
                );
              })}
            </Thead>
            <Tbody>
              {prefix.length > 0 && (
                <Tr
                  borderColor={'frostyNightfall.100'}
                  borderBottom={'1px solid'}
                  onClick={() => {
                    clearPage();
                    table.toggleAllRowsSelected(false);
                    const targetPrefix = [...prefix];
                    targetPrefix.pop();
                    setPrefix(targetPrefix);
                  }}
                  bgColor="#FAFAFB"
                  _hover={{
                    bgColor: 'white_.600'
                  }}
                  cursor={'pointer'}
                >
                  <Td pos={'sticky'} left={'0'} w="24px" />
                  <Td pos={'sticky'} left={'24px'} w="200px">
                    <HStack gap="10px">
                      <FolderIcon boxSize={'20px'} color="blue.600" />
                      <Text color="grayModern.900">..</Text>
                    </HStack>
                  </Td>
                  <Td />
                  <Td />
                  <Td />
                  <Td />
                </Tr>
              )}
              {table.getRowModel().rows.map((row) => (
                <Tr
                  key={row.id}
                  bgColor={'#FAFAFB'}
                  _hover={{
                    bgColor: 'white_.600'
                  }}
                  onClick={() => {
                    const file = row.original;
                    if (!file.isDir) return;
                    clearPage();
                    table.toggleAllRowsSelected(false);
                    setPrefix([...prefix, file.fileName]);
                  }}
                  cursor={row.original.isDir ? 'pointer' : 'initial'}
                >
                  {row.getAllCells().map((cell) => (
                    <Td
                      w={cell.column.id === TableHeaderID.select ? '24px' : 'initial'}
                      key={cell.id}
                      {...(cell.column.getIsPinned()
                        ? {
                            [cell.column.getIsPinned() as string]:
                              24 * cell.column.getPinnedIndex() + 'px',
                            position: 'sticky',
                            zIndex: 2
                          }
                        : {})}
                      bgColor={'inherit'}
                      isNumeric={[TableHeaderID.action].includes(cell.column.id as TableHeaderID)}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Table>
          {fileList.length === 0 && (
            <AbsoluteCenter flex="auto">
              <Center
                borderWidth={'0.8px'}
                borderStyle={'dashed'}
                borderColor={'grayModern.400'}
                borderRadius={'50%'}
                p="12px"
              >
                <StorageIcon boxSize="64px" color={'grayModern.500'} />
              </Center>
            </AbsoluteCenter>
          )}
        </TableContainer>
      )}
      <HStack justifyContent={'flex-end'} minH={'max-content'} mt="auto" mb="0">
        <ButtonGroup variant={'white-bg-icon'}>
          <Button
            isDisabled={
              pageStack.length === 0 ||
              !(pageStack[0] === ContinuationToken) ||
              objectsQuery.isLoading
            }
            onClick={() => {
              setpageStack((pageStack) => {
                const target = [...pageStack];
                if (objectsQuery.data?.IsTruncated) {
                  const _nextToken = target.pop();
                  const _currentToken = target.pop();
                  const preToken = target.pop();
                  setContinuationToken(preToken);
                } else {
                  const _currentToken = target.pop();
                  const preToken = target.pop();
                  setContinuationToken(preToken);
                }
                return target;
              });
            }}
          >
            {toolsT('previousPage')}
          </Button>
          <Button
            isDisabled={!objectsQuery.data?.IsTruncated || objectsQuery.isLoading}
            onClick={() => {
              setContinuationToken(pageStack[pageStack.length - 1]);
            }}
          >
            {toolsT('nextPage')}
          </Button>
          <Menu>
            {({ isOpen }) => (
              <>
                <MenuButton
                  isActive={isOpen}
                  as={Button}
                  variant={'white-bg-icon'}
                  rightIcon={<ArrowDownSLineIcon boxSize={'20px'} />}
                  px="8px"
                  py="6px"
                  w="auto"
                >
                  {MaxKeys}/{toolsT('page')}
                </MenuButton>
                <MenuList>
                  {[20, 50, 100, 200, 400].map((v) => (
                    <MenuItem
                      onClick={() => {
                        setMaxKeys(v);
                        clearPage();
                      }}
                      key={v}
                    >
                      {v}
                    </MenuItem>
                  ))}
                </MenuList>
              </>
            )}
          </Menu>
        </ButtonGroup>
      </HStack>
    </Flex>
  );
}
