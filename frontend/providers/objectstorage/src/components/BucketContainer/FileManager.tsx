import { deleteObject, listObjects } from '@/api/s3';
import { FolderPlaceholder, QueryKey } from '@/consts';
import { useOssStore } from '@/store/ossStore';
import {
  AbsoluteCenter,
  Box,
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
  Tr,
  useCheckboxGroup
} from '@chakra-ui/react';
import Fuse from 'fuse.js';
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
import { GetObjectCommand, _Object } from '@aws-sdk/client-s3';
import { useToast } from '@/hooks/useToast';
import { useEffect, useState } from 'react';
import ArrowDownSLineIcon from '../Icons/ArrowDownSLineIcon';
import { formatBytes, useCopyData } from '@/utils/tools';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { format } from 'date-fns';
import DeleteFileModal from '../common/modal/DeleteFileModal';
import DeleteSingleFileModal from '../common/modal/DeleteSingleFileModal';
import StorageIcon from '../Icons/StorageIcon';
import useSessionStore from '@/store/session';

type EntryType = {
  LastModified?: Date;
  fileName: string;
  Key: string;
  Size?: number;
  type: string;
  isDir: boolean;
};
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
  const [searchVal, setSearchVal] = useState('');
  const [MaxKeys, setMaxKeys] = useState(20);
  const { toast } = useToast();
  const setPrefix = useOssStore((s) => s.setPrefix);
  const queryClient = useQueryClient();
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
    deleteCheckBoxGroupState.setValue([]);
  }, [bucket, prefix, pageStack, ContinuationToken]);
  const deleteMutation = useMutation({
    mutationFn: deleteObject(s3client!),
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.minioFileList],
        exact: false
      });
      toast({
        status: 'success',
        title: 'delete successfully'
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
  const fileList: EntryType[] = [
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
  ];
  const fuse = new Fuse(fileList, {
    keys: ['fileName']
  });
  if (prefix.length > 0)
    fileList.unshift({
      LastModified: undefined,
      fileName: '..',
      Key: [prefix, '..'].join('/'),
      Size: 0,
      type: 'link',
      isDir: true
    });
  const fuseList = fuse.search(searchVal);
  // --------
  // budle delete
  const deleteCheckBoxGroupState = useCheckboxGroup({
    defaultValue: []
  });

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
    deleteCheckBoxGroupState.setValue([]);
  };
  const trueFileList = fileList.filter(
    (f) => !((f.fileName === '..' && f.isDir) || f.fileName === FolderPlaceholder)
  );
  const allDelete =
    trueFileList.length > 0 &&
    trueFileList.every((f) => deleteCheckBoxGroupState.value.includes(f.Key));
  const someDelete =
    trueFileList.some((f) => deleteCheckBoxGroupState.value.includes(f.Key)) && !allDelete;
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
            onChange={(v) => setSearchVal(v.target.value.trim())}
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
              multiDeleteEntry(deleteCheckBoxGroupState.value as string[]);
            }}
            fileListLength={deleteCheckBoxGroupState.value.length}
          />
          <Button
            display={'flex'}
            gap="8px"
            onClick={() => {
              deleteCheckBoxGroupState.setValue([]);
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
              px: '17px',
              py: '7px'
            }
          }}
          position={'relative'}
        >
          <Table variant="simple">
            <Thead>
              <Tr bgColor={'white_.500'} color={'grayModern.600'}>
                <Th>
                  <Flex gap="10px">
                    <Box onClick={(e) => e.stopPropagation()}>
                      {trueFileList.length > 0 && (
                        <Checkbox
                          isChecked={allDelete}
                          onChange={(e) => {
                            e.target.checked
                              ? deleteCheckBoxGroupState.setValue(trueFileList.map((f) => f.Key))
                              : deleteCheckBoxGroupState.setValue([]);
                          }}
                          isIndeterminate={someDelete}
                        />
                      )}
                    </Box>
                    {t('fileName')}
                  </Flex>
                </Th>
                <Th>{t('fileSize')}</Th>
                <Th>{t('fileType')}</Th>
                <Th>{t('modifiedTime')}</Th>
                <Th isNumeric>
                  <Text>{t('action')}</Text>
                </Th>
              </Tr>
            </Thead>
            <Tbody
              color="grayModern.600"
              sx={{
                td: {
                  px: '17px',
                  py: '11px'
                }
              }}
            >
              {(searchVal == '' ? fileList : fuseList.map((v) => v.item)).map((file) => (
                <Tr
                  key={file.fileName}
                  _hover={{
                    bgColor: 'white_.600'
                  }}
                  onClick={() => {
                    if (!file.isDir) return;
                    clearPage();
                    deleteCheckBoxGroupState.setValue([]);
                    if (file.type === 'link') {
                      const targetPrefix = [...prefix];
                      targetPrefix.pop();
                      setPrefix(targetPrefix);
                    } else setPrefix([...prefix, file.fileName]);
                  }}
                  cursor={file.isDir ? 'pointer' : 'initial'}
                >
                  <Td>
                    <HStack gap="10px">
                      {!(file.type === 'link' && file.isDir) && (
                        <Box onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            {...deleteCheckBoxGroupState.getCheckboxProps({ value: file.Key })}
                          />
                        </Box>
                      )}
                      {
                        // isdir
                        file.isDir ? (
                          <FolderIcon boxSize={'20px'} color="blue.600" />
                        ) : (
                          <FileIcon boxSize={'20px'} color="purple.500" />
                        )
                      }
                      <Text color="grayModern.900">{file.fileName}</Text>
                    </HStack>
                  </Td>
                  <Td>{file.isDir ? '--' : formatBytes(file.Size || 0).toString()}</Td>
                  <Td>{file.type}</Td>
                  <Td>{file.LastModified ? format(file.LastModified, 'yyyy/MM/dd hh:mm') : ''}</Td>
                  <Td isNumeric>
                    <ButtonGroup variant={'white-bg-icon'} color={'grayModern.900'}>
                      {!file.isDir && (
                        <IconButton
                          icon={<VisibityIcon boxSize={'14px'} />}
                          p="5px"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!s3client || !Bucket) return;
                            getSignedUrl(s3client, new GetObjectCommand({ Bucket, Key: file.Key }))
                              .then((url) => {
                                window.open(new URL(url));
                              })
                              .catch((err) => {
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
                            getSignedUrl(s3client, new GetObjectCommand({ Bucket, Key: file.Key }))
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
                  </Td>
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
