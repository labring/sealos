import { deleteImageHub, uploadImageHub } from '@/api/app';
import FileSelect from '@/components/FileSelect';
import MyIcon from '@/components/Icon';
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
  useTheme
} from '@chakra-ui/react';
import type { ThemeType } from '@sealos/ui';
import { useMessage } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import React, { useMemo, useState } from 'react';

type ImageItem = {
  created: string;
  image: string;
  size: string;
  tag: string;
};

const AppList = ({
  apps = [],
  namespaces,
  refetchApps
}: {
  namespaces: string[];
  apps: ImageItem[];
  refetchApps: () => void;
}) => {
  console.log(apps, 'apps');

  const { t } = useTranslation();
  const { message: toast } = useMessage();
  const theme = useTheme<ThemeType>();
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [imageNs, setImageNs] = useState('default');
  const [imageName, setImageName] = useState('');
  const [imageTag, setImageTag] = useState('');
  const [image, setImage] = useState<ImageItem>();

  const [files, setFiles] = useState<File[]>([]);
  const { isOpen: isUploadOpen, onOpen: onUploadOpen, onClose: onUploadClose } = useDisclosure();

  const columns = useMemo<
    {
      title: string;
      key: string;
      render?: (item: any) => JSX.Element;
    }[]
  >(
    () => [
      {
        title: '镜像',
        key: 'image',
        render: (item: any) => (
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
        render: (item: any) => <Box>{item.created}</Box>
      },
      {
        title: '大小',
        key: 'size',
        render: (item: any) => <Box>{item.size}</Box>
      },
      {
        title: '操作',
        key: 'operation',
        render: (item: ImageItem) => (
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

  const validateNamespace = (name: string) => {
    const regex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
    return regex.test(name);
  };

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
                data-id={item.id}
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
                setImage(undefined);
                onClose();
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
              <Box w={'70px'}>镜像名称:</Box>
              <Input value={imageName} onChange={(e) => setImageName(e.target.value)} />
            </Flex>
            <Flex alignItems={'center'} gap={'12px'} mt={'12px'}>
              <Box w={'70px'}>镜像TAG:</Box>
              <Input value={imageTag} onChange={(e) => setImageTag(e.target.value)} />
            </Flex>

            <Flex alignItems={'center'} gap={'12px'} mt={'12px'}>
              <Box w={'70px'}>命名空间:</Box>
              <Input value={imageNs} onChange={(e) => setImageNs(e.target.value)} />
            </Flex>
            <FileSelect fileExtension="*" multiple={false} files={files} setFiles={setFiles} />
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onUploadClose}>
              取消
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await uploadImageHub({
                    image_name: imageName,
                    tag: imageTag,
                    namespace: imageNs,
                    image_file: files[0]
                  });
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
