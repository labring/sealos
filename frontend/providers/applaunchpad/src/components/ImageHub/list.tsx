import { buildDockerImage, deleteImageHub, uploadImageFiles, uploadImageHub, setImagesPurpose, getImagesPurpose } from '@/api/app';
import FileSelect from '@/components/FileSelect';
import MyIcon from '@/components/Icon';
import { ImageHubItem } from '@/pages/api/imagehub/get';
import { formatPodTime } from '@/utils/tools';
import {
  Box,
  Button,
  Center,
  Flex,
  Grid,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
  useTheme,
  Select,
  Textarea
} from '@chakra-ui/react';
import type { ThemeType } from '@sealos/ui';
import { useMessage } from '@sealos/ui';
import dayjs from 'dayjs';
import { debounce } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

const AppList = ({
  apps = [],
  namespaces,
  refetchApps,
  onSearch
}: {
  namespaces: string[];
  apps: ImageHubItem[];
  refetchApps: () => void;
  onSearch: (value: string) => void;
}) => {
  const { t } = useTranslation();
  const { message: toast } = useMessage();
  const theme = useTheme<ThemeType>();
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [imageNs, setImageNs] = useState('default');
  const [imageName, setImageName] = useState('');
  const [imageTag, setImageTag] = useState('');
  const [image, setImage] = useState<ImageHubItem>();
  const [purpose, setPurpose] = useState('');
  const [purposeMap, setPurposeMap] = useState<any>(null);

  const [files, setFiles] = useState<File[]>([]);
  const { isOpen: isUploadOpen, onOpen: onUploadOpen, onClose: onUploadClose } = useDisclosure();
  const { isOpen: isConstructUploadOpen, onOpen: onConstructUploadOpen, onClose: onConstructUploadClose } = useDisclosure();

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState({ imageNs: '', imageName: '', imageTag: '', purpose: '' });
  const [inputValue, setInputValue] = useState('');

  const [constructImage, setConstructImage] = useState('');
  const [constructImageTag, setConstructImageTag] = useState('');
  const [constructImageNs, setConstructImageNs] = useState('default');
  const [constructDockerfile, setConstructDockerfile] = useState('');
  const [constructFiles, setConstructFiles] = useState<File[]>([]);
  const [constructImageName, setConstructImageName] = useState('');
  const [constructError, setConstructError] = useState({
    constructImage: '',
    constructImageName: '',
    constructImageTag: '',
    constructImageNs: '',
    constructDockerfile: ''
  });
  const [uploadExPath, setUploadExPath] = useState('');
  const [uploadFirstItems, setUploadFirstItems] = useState<any[]>([]);

  // useEffect(() => {
  //   console.log('aaasd', constructImage, constructFiles)
  // }, [constructImage, constructFiles])

  useEffect(() => {
    initPurposeMap()
  }, [])

  const initPurposeMap = async () => {
    const resp = await getImagesPurpose()
    if (resp && resp.data) {
      setPurposeMap(resp.data)
    }
  }

  useEffect(() => {
    if (constructFiles.length > 0) {
      uploadImageHandle(constructFiles[0])
    }
  }, [constructFiles])

  useEffect(() => {
    if (constructImage && uploadFirstItems.length > 0) {
      const imageString = `from ${constructImage}\n`
      const filesString = uploadFirstItems.map((item: any) => {
        return `add ${item.name}`
      }).join('\n')
      setConstructDockerfile(imageString + filesString)
    }
  }, [constructImage, uploadFirstItems])

  const uploadImageHandle = async (data: any) => {
    const resp = await uploadImageFiles({
      image: data,
    })
    if (resp && resp.extracted_path) {
      setUploadExPath(resp.data);
      setUploadFirstItems(resp.first_level_items || [])
    }
  }

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        onSearch(value);
      }, 500),
    []
  );

  const purposeName = useCallback((item: any) => {
    console.log('purposeMap', purposeMap, item)
    if (purposeMap) {
      const ns = item.image.split('/')[0]
      const name = item.image.split('/')[1]
      const key = `${name}-${item.tag}-${ns}`
      const currentPurpose = purposeMap[key]
      return currentPurpose || ''
    }
    return ''
  }, [purposeMap])

  const columns = useMemo<
    {
      title: string;
      key: string;
      render?: (item: ImageHubItem) => JSX.Element;
    }[]
  >(
    () => [
      {
        title: '镜像',
        key: 'image',
        render: (item: ImageHubItem) => (
          <Box pl={4} color={'myGray.900'} fontSize={'md'} fontWeight={'bold'}>
            {item.image}
          </Box>
        )
      },
      {
        title: 'tag',
        key: 'tag',
        render: (item: any) => <Box>{item.tag}</Box>
      },
      {
        title: '时间',
        key: 'created',
        render: (item: any) => <Box>{dayjs(item.created).format('YYYY-MM-DD HH:mm:ss')}</Box>
      },
      {
        title: '大小',
        key: 'size',
        render: (item: any) => <Box>{item.size}</Box>
      },
      {
        title: '用途',
        key: 'purpose',
        render: (item: any) => <Box>{purposeName(item)}</Box>
      },
      {
        title: '操作',
        key: 'operation',
        render: (item: ImageHubItem) => (
          <Button
            variant="ghost"
            colorScheme="red"
            size="sm"
            onClick={() => {
              setImage(item);
              onOpen();
            }}
          >
            删除
          </Button>
        )
      }
    ],
    []
  );

  return (
    <Flex flexDirection={'column'} h={`calc(100% - 48px)`}>
      <Flex h={'88px'} alignItems={'center'}>
        <Center
          w="46px"
          h={'46px'}
          mr={4}
          backgroundColor={'#FEFEFE'}
          border={theme.borders[200]}
          borderRadius={'md'}
        >
          <MyIcon name="logo" w={'24px'} h={'24px'} />
        </Center>
        <Box fontSize={'xl'} color={'grayModern.900'} fontWeight={'bold'}>
          镜像列表
        </Box>
        <Box ml={3} color={'grayModern.500'}>
          ( {apps.length} )
        </Box>
        <Box flex={1}></Box>

        <Input
          placeholder="搜索"
          mr={'14px'}
          value={inputValue}
          onChange={(e) => {
            const newValue = e.target.value;
            setInputValue(newValue);
            debouncedSearch(newValue);
          }}
        />

        <Button
          h={'40px'}
          mr={'14px'}
          minW={'140px'}
          onClick={() => {
            router.push('/apps');
          }}
        >
          应用列表
        </Button>
        <Button
          leftIcon={
            <Icon w="20px" h="20px" fill={'currentcolor'}>
              <path d="M11 19.7908V13.7908H5V11.7908H11V5.79077H13V11.7908H19V13.7908H13V19.7908H11Z" />
            </Icon>
          }
          h={'40px'}
          mr={'14px'}
          minW={'140px'}
          onClick={() => {
            setConstructFiles([]);
            onConstructUploadOpen();
          }}
        >
          构建镜像
        </Button>
        <Button
          leftIcon={
            <Icon w="20px" h="20px" fill={'currentcolor'}>
              <path d="M11 19.7908V13.7908H5V11.7908H11V5.79077H13V11.7908H19V13.7908H13V19.7908H11Z" />
            </Icon>
          }
          h={'40px'}
          mr={'14px'}
          minW={'140px'}
          onClick={() => {
            setFiles([]);
            onUploadOpen();
          }}
        >
          上传镜像
        </Button>
      </Flex>

      <Grid
        height={'40px'}
        templateColumns={`repeat(${columns.length},1fr)`}
        overflowX={'auto'}
        borderRadius={'md'}
        mb={2}
        fontSize={'base'}
        color={'grayModern.600'}
        fontWeight={'bold'}
      >
        {columns.map((item, i) => (
          <Box
            px={3}
            py={3}
            bg={'white'}
            key={item.key}
            whiteSpace={'nowrap'}
            _first={{
              pl: 7
            }}
          >
            {item.title}
          </Box>
        ))}
      </Grid>

      <Box h={'0'} flex={1} overflowY={'auto'}>
        {apps.map((item: any, index1) => (
          <Grid
            templateColumns={`repeat(${columns.length},1fr)`}
            overflowX={'auto'}
            key={index1}
            bg={'white'}
            _hover={{
              bg: '#FBFBFC'
            }}
            borderTopRadius={index1 === 0 ? 'md' : '0px'}
            borderBottomRadius={index1 === apps.length - 1 ? 'md' : '0px'}
            borderBottom={'1px solid'}
            borderBottomColor={index1 !== apps.length - 1 ? 'grayModern.150' : 'transparent'}
          >
            {columns.map((col, index2) => (
              <Flex
                className={index2 === 0 ? '' : ''}
                data-id={item.image + item.name}
                key={col.key}
                alignItems={'center'}
                px={3}
                py={4}
                fontSize={'base'}
                fontWeight={'bold'}
                color={'grayModern.900'}
              >
                {col.render ? col.render(item) : col.key ? `${item[col.key]}` : ''}
              </Flex>
            ))}
          </Grid>
        ))}
      </Box>

      <Modal
        isOpen={isOpen}
        onClose={() => {
          onClose();
          setImage(undefined);
        }}
        closeOnOverlayClick={false}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>删除镜像</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            确定删除镜像吗
            <Box px={'2px'} color={'grayModern.900'} fontWeight={'bold'} userSelect={'all'}>
              {image?.image}:{image?.tag}
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button
              width={'64px'}
              onClick={() => {
                onClose();
                setImage(undefined);
              }}
              variant={'outline'}
            >
              {t('Cancel')}
            </Button>
            <Button
              width={'64px'}
              ml={3}
              variant={'solid'}
              onClick={async () => {
                await deleteImageHub(image?.image as string, image?.tag as string);
                onClose();
                setImage(undefined);
                refetchApps();
                toast({
                  title: 'success',
                  status: 'success'
                });
              }}
            >
              {t('Confirm')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isUploadOpen} onClose={onUploadClose} closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent maxW={'600px'}>
          <ModalHeader>上传镜像</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Flex alignItems={'center'} gap={'12px'}>
              <Flex alignItems={'center'} w={'80px'}>
                镜像名称: <span style={{ color: 'red' }}>✳</span>
              </Flex>
              <Input
                errorBorderColor="red.300"
                isInvalid={error.imageName !== ''}
                value={imageName}
                onChange={(e) => {
                  setImageName(e.target.value);
                  setError((prev) => ({ ...prev, imageName: '' }));
                }}
              />
            </Flex>
            <Flex alignItems={'center'} gap={'12px'} mt={'12px'}>
              <Flex alignItems={'center'} w={'80px'}>
                镜像TAG: <span style={{ color: 'red' }}>✳</span>
              </Flex>
              <Input
                errorBorderColor="red.300"
                isInvalid={error.imageTag !== ''}
                value={imageTag}
                onChange={(e) => {
                  setImageTag(e.target.value);
                  setError((prev) => ({ ...prev, imageTag: '' }));
                }}
              />
            </Flex>

            <Flex alignItems={'center'} gap={'12px'} mt={'12px'}>
              <Flex alignItems={'center'} w={'80px'}>
                命名空间: <span style={{ color: 'red' }}>✳</span>
              </Flex>
              <Input
                errorBorderColor="red.300"
                isInvalid={error.imageNs !== ''}
                value={imageNs}
                onChange={(e) => {
                  setImageNs(e.target.value);
                  setError((prev) => ({ ...prev, imageNs: '' }));
                }}
              />
            </Flex>

            <Flex alignItems={'center'} gap={'12px'} mt={'12px'}>
              <Flex alignItems={'center'} w={'80px'}>
                用途: <span style={{ color: 'red' }}>✳</span>
              </Flex>
              <Input
                errorBorderColor="red.300"
                isInvalid={error.purpose !== ''}
                value={purpose}
                onChange={(e) => {
                  setPurpose(e.target.value);
                  setError((prev) => ({ ...prev, purpose: '' }));
                }}
              />
            </Flex>
            <FileSelect fileExtension="*" multiple={false} files={files} setFiles={setFiles} />
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onUploadClose}>
              取消
            </Button>
            <Button
              variant="outline"
              isLoading={isUploading}
              isDisabled={isUploading}
              onClick={async () => {
                const newError = {
                  imageName: imageName ? '' : 'Image Name is required',
                  imageTag: imageTag ? '' : 'Image Tag is required',
                  imageNs: imageNs ? '' : 'Namespace is required',
                  purpose: purpose ? '' : 'Purpose is required'
                };

                setError(newError);

                if (Object.values(newError).some((err) => err !== '')) {
                  toast({
                    status: 'error',
                    title: '请填写所有必填项'
                  });
                  return;
                }

                setIsUploading(true);
                try {

                  await setImagesPurpose({
                    key: `${imageName}-${imageTag}-${imageNs}`,
                    value: purpose
                  })
                  await uploadImageHub({
                    image_name: imageName,
                    tag: imageTag,
                    namespace: imageNs,
                    image_file: files[0]
                  });

                  initPurposeMap()
                  refetchApps();
                  toast({
                    status: 'success',
                    title: '上传成功'
                  });
                  onUploadClose();
                } catch (error) {
                  toast({
                    status: 'error',
                    title: 'error'
                  });
                } finally {
                  setIsUploading(false);
                }
              }}
            >
              确定
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isConstructUploadOpen} onClose={onConstructUploadClose} closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent maxW={'600px'}>
          <ModalHeader>构建镜像</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Flex alignItems={'center'} gap={'12px'}>
              <Flex alignItems={'center'} w={'80px'}>
                基础镜像: <span style={{ color: 'red' }}>✳</span>
              </Flex>
              <Select
                w={'300px'}
                errorBorderColor="red.300"
                borderColor={'#02A7F0'}
                isInvalid={constructError.constructImage !== ''}
                _hover={{ borderColor: '#02A7F0' }}
                value={constructImage}
                onChange={
                  (e) => {
                    setConstructImage(e.target.value);
                    setError((prev) => ({ ...prev, constructImage: '' }));
                  }
                }
              >
                <option value="">请选择</option>
                {apps.map((item: any) => (
                  <option key={item.created} value={item.image}>
                    {item.image}
                  </option>
                ))}
              </Select>
            </Flex>

            <Flex alignItems={'center'} gap={'12px'} mt={'12px'}>
              <Flex alignItems={'center'} w={'80px'}>
                镜像名称: <span style={{ color: 'red' }}>✳</span>
              </Flex>
              <Input
                errorBorderColor="red.300"
                isInvalid={constructError.constructImageName !== ''}
                value={constructImageName}
                onChange={(e) => {
                  setConstructImageName(e.target.value);
                  setError((prev) => ({ ...prev, constructImageName: '' }));
                }}
              />
            </Flex>

            <Flex alignItems={'center'} gap={'12px'} mt={'12px'}>
              <Flex alignItems={'center'} w={'80px'}>
                镜像TAG: <span style={{ color: 'red' }}>✳</span>
              </Flex>
              <Input
                errorBorderColor="red.300"
                isInvalid={constructError.constructImageTag !== ''}
                value={constructImageTag}
                onChange={(e) => {
                  setConstructImageTag(e.target.value);
                  setError((prev) => ({ ...prev, constructImageTag: '' }));
                }}
              />
            </Flex>

            <Flex alignItems={'center'} gap={'12px'} mt={'12px'}>
              <Flex alignItems={'center'} w={'80px'}>
                命名空间: <span style={{ color: 'red' }}>✳</span>
              </Flex>
              <Input
                errorBorderColor="red.300"
                isInvalid={constructError.constructImageNs !== ''}
                value={constructImageNs}
                onChange={(e) => {
                  setConstructImageNs(e.target.value);
                  setError((prev) => ({ ...prev, constructImageNs: '' }));
                }}
              />
            </Flex>
            <FileSelect fileExtension="*" multiple={false} files={constructFiles} setFiles={setConstructFiles} />
            <Flex alignItems={'center'} gap={'12px'} mt={'12px'}>
              <Flex alignItems={'center'} w={'80px'}>
                Dockerfile: <span style={{ color: 'red' }}>✳</span>
              </Flex>
              <Textarea
                errorBorderColor="red.300"
                isInvalid={constructError.constructDockerfile !== ''}
                value={constructDockerfile}
                backgroundColor={'#fff'}
                borderColor={'#02A7F0'}
                _hover={{ borderColor: '#02A7F0' }}
                onChange={(e) => {
                  setConstructDockerfile(e.target.value);
                  setError((prev) => ({ ...prev, constructDockerfile: '' }));
                }}
              />
            </Flex>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onConstructUploadClose}>
              取消
            </Button>
            <Button
              variant="outline"
              isLoading={isUploading}
              isDisabled={isUploading}
              onClick={async () => {
                console.log('asdasdasd', constructImage, constructImageTag, constructImageNs, constructDockerfile)
                const newError = {
                  constructImage: constructImage ? '' : '请选择',
                  constructImageName: constructImageName ? '' : '请输入',
                  constructImageTag: constructImageTag ? '' : '请输入',
                  constructImageNs: constructImageNs ? '' : '请输入',
                  constructDockerfile: constructDockerfile ? '' : '请输入'
                };

                setConstructError(newError);

                if (Object.values(newError).some((err) => err !== '')) {
                  toast({
                    status: 'error',
                    title: '请填写所有必填项'
                  });
                  return;
                }

                setIsUploading(true);
                try {
                  await buildDockerImage({
                    path: uploadExPath || '',
                    namespace: constructImageNs,
                    imageName: constructImageName,
                    version: 'v1.0',
                    dockerfile: constructDockerfile
                  })
                  refetchApps();
                  toast({
                    status: 'success',
                    title: '上传成功'
                  });
                  onConstructUploadClose();
                } catch (error) {
                  toast({
                    status: 'error',
                    title: 'error'
                  });
                } finally {
                  setIsUploading(false);
                }
              }}
            >
              确定
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
};

export default React.memo(AppList);
