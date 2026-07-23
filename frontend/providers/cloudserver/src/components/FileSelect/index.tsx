import { useLoading } from '@/hooks/useLoading';
import { useSelectFile } from '@/hooks/useSelectFile';
import { useToast } from '@/hooks/useToast';
import { Box, Center, Flex, Icon, Text, type BoxProps } from '@chakra-ui/react';
import { customAlphabet } from 'nanoid';
import { useTranslation } from 'next-i18next';
import { DragEvent, useCallback, useState } from 'react';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 12);

export const FileImgs = [
  {
    reg: /\.yaml$/i,
    src: (
      <Icon
        xmlns="http://www.w3.org/2000/svg"
        width="16px"
        height="16px"
        viewBox="0 0 16 16"
        fill="#7B838B"
      >
        <path d="M9.33329 1.33301H3.99996C3.26663 1.33301 2.67329 1.93301 2.67329 2.66634L2.66663 13.333C2.66663 14.0663 3.25996 14.6663 3.99329 14.6663H12C12.7333 14.6663 13.3333 14.0663 13.3333 13.333V5.33301L9.33329 1.33301ZM3.99996 13.333V2.66634H8.66663V5.99967H12V13.333H3.99996Z" />
      </Icon>
    )
  },
  {
    reg: /\.(svg|png|jpg|jpeg|gif|bmp)$/i,
    src: (
      <Icon
        xmlns="http://www.w3.org/2000/svg"
        width="16px"
        height="16px"
        viewBox="0 0 16 16"
        fill="#7B838B"
      >
        <g clipPath="url(#clip0_29_17085)">
          <path d="M13.3333 2C13.6869 2 14.0261 2.14048 14.2761 2.39052C14.5262 2.64057 14.6666 2.97971 14.6666 3.33333V12.6667C14.6666 13.0203 14.5262 13.3594 14.2761 13.6095C14.0261 13.8595 13.6869 14 13.3333 14H2.66665C2.31302 14 1.97389 13.8595 1.72384 13.6095C1.47379 13.3594 1.33331 13.0203 1.33331 12.6667V3.33333C1.33331 2.97971 1.47379 2.64057 1.72384 2.39052C1.97389 2.14048 2.31302 2 2.66665 2H13.3333ZM13.3333 3.33333H2.66665V12.6667H3.28598L9.49131 6.46133C9.5687 6.38393 9.66057 6.32253 9.76169 6.28063C9.86281 6.23874 9.97119 6.21718 10.0806 6.21718C10.1901 6.21718 10.2985 6.23874 10.3996 6.28063C10.5007 6.32253 10.5926 6.38393 10.67 6.46133L13.3333 9.124V3.33333ZM10.0806 7.75733L5.17131 12.6667H13.3333V11.01L10.0806 7.75733ZM4.99998 4.66667C5.2652 4.66667 5.51955 4.77202 5.70709 4.95956C5.89462 5.1471 5.99998 5.40145 5.99998 5.66667C5.99998 5.93188 5.89462 6.18624 5.70709 6.37377C5.51955 6.56131 5.2652 6.66667 4.99998 6.66667C4.73476 6.66667 4.48041 6.56131 4.29287 6.37377C4.10534 6.18624 3.99998 5.93188 3.99998 5.66667C3.99998 5.40145 4.10534 5.1471 4.29287 4.95956C4.48041 4.77202 4.73476 4.66667 4.99998 4.66667Z" />
        </g>
      </Icon>
    )
  }
];

export type FileItemType = {
  id: string;
  filename: string;
  text?: string;
  file: File;
  icon: JSX.Element;
};
interface Props extends BoxProps {
  fileExtension: string;
  files: FileItemType[];
  setFiles: React.Dispatch<React.SetStateAction<FileItemType[]>>;
}

const FileSelect = ({ fileExtension, setFiles, files, ...BoxStyle }: Props) => {
  const { Loading: FileSelectLoading } = useLoading();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [selecting, setSelecting] = useState(false);

  const { File, onOpen } = useSelectFile({
    fileType: fileExtension,
    multiple: true
  });

  const onSelectFile = useCallback(
    async (files: File[]) => {
      setSelecting(true);
      try {
        // Parse file by file
        let promise = Promise.resolve<FileItemType[]>([]);
        files.forEach((file) => {
          promise = promise.then(async (result) => {
            let icon = FileImgs.find((item) => item.reg.test(file.name))?.src;
            if (!icon) {
              icon = FileImgs[0].src;
            }
            const fileItem: FileItemType = {
              id: nanoid(),
              filename: file.name,
              icon,
              file: file
            };
            return [...result, fileItem];
          });
        });
        const chunkFiles = await promise;
        console.log(chunkFiles);

        setFiles(chunkFiles);
      } catch (error: any) {
        console.log(error);
        toast({
          title: typeof error === 'string' ? error : '解析文件失败',
          status: 'error'
        });
      }
      setSelecting(false);
    },
    [setFiles, toast]
  );

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const items = e.dataTransfer.items;
      const fileList: File[] = [];

      if (e.dataTransfer.items.length <= 1) {
        const traverseFileTree = async (item: any) => {
          return new Promise<void>((resolve, reject) => {
            if (item.isFile) {
              item.file((file: File) => {
                fileList.push(file);
                resolve();
              });
            } else if (item.isDirectory) {
              const dirReader = item.createReader();
              dirReader.readEntries(async (entries: any[]) => {
                for (let i = 0; i < entries.length; i++) {
                  await traverseFileTree(entries[i]);
                }
                resolve();
              });
            }
          });
        };
        for (let i = 0; i < items.length; i++) {
          const item = items[i].webkitGetAsEntry();
          if (item) {
            await traverseFileTree(item);
          }
        }
      } else {
        const files = Array.from(e.dataTransfer.files);
        let isErr = files.some((item) => item.type === '');
        if (isErr) {
          return toast({
            title: t('file.upload error description'),
            status: 'error'
          });
        }
        for (let i = 0; i < files.length; i++) {
          fileList.push(files[i]);
        }
      }
      onSelectFile(fileList);
    },
    [onSelectFile, t, toast]
  );

  return (
    <Flex flexDirection={'column'}>
      <Flex
        position={'relative'}
        bg={'#f4f6f8'}
        justifyContent={'center'}
        alignItems={'center'}
        h="132px"
        borderRadius={'4px'}
        border={'1px solid #DEE0E2'}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        gap="8px"
        {...BoxStyle}
      >
        <Icon w="24px" h="24px" fill={'#1D8CDC'}>
          <path d="M11 19.7908V13.7908H5V11.7908H11V5.79077H13V11.7908H19V13.7908H13V19.7908H11Z" />
        </Icon>
        <Text
          color={'#1D8CDC'}
          fontSize={'16px'}
          fontWeight={600}
          cursor={'pointer'}
          onClick={onOpen}
        >
          {t('Upload File')}
        </Text>
        {/* <Box
        w={'auto'}
        maxW={'200px'}
        h="35px"
        bottom={'0'}
        right={'0'}
        fontWeight={400}
        fontSize={'14px'}
        overflowY={'scroll'}
        position={'absolute'}
      >
        {files.map((item) => (
          <Flex alignItems={'center'} key={item.id}>
            {item.icon}
            <Box ml="8px">{item.filename}</Box>
            <Icon
              ml="auto"
              w="24px"
              h="24px"
              fill="#5A646E"
              cursor={'pointer'}
              onClick={() => {
                setFiles((state) => state.filter((file) => file.id !== item.id));
              }}
            >
              <path d="M9.375 18.0408C9.05417 18.0408 8.77961 17.9266 8.55133 17.6984C8.32267 17.4697 8.20833 17.1949 8.20833 16.8741V9.29077H7.625V8.1241H10.5417V7.54077H14.0417V8.1241H16.9583V9.29077H16.375V16.8741C16.375 17.1949 16.2609 17.4697 16.0326 17.6984C15.8039 17.9266 15.5292 18.0408 15.2083 18.0408H9.375ZM15.2083 9.29077H9.375V16.8741H15.2083V9.29077ZM10.5417 15.7074H11.7083V10.4574H10.5417V15.7074ZM12.875 15.7074H14.0417V10.4574H12.875V15.7074ZM9.375 9.29077V16.8741V9.29077Z" />
            </Icon>
          </Flex>
        ))}
      </Box> */}

        <FileSelectLoading loading={selecting} fixed={false} />
        <File onSelect={onSelectFile} />
      </Flex>
      <Box mt="12px" maxH={'100px'} fontWeight={400} fontSize={'14px'} overflowY={'scroll'}>
        {files.map((item) => (
          <Flex alignItems={'center'} key={item.id}>
            <Center w="16px" mr="8px">
              {item.icon}
            </Center>
            {item.filename}
            <Icon
              ml="auto"
              w="24px"
              h="24px"
              fill="#5A646E"
              cursor={'pointer'}
              onClick={() => {
                setFiles((state) => state.filter((file) => file.id !== item.id));
              }}
            >
              <path d="M9.375 18.0408C9.05417 18.0408 8.77961 17.9266 8.55133 17.6984C8.32267 17.4697 8.20833 17.1949 8.20833 16.8741V9.29077H7.625V8.1241H10.5417V7.54077H14.0417V8.1241H16.9583V9.29077H16.375V16.8741C16.375 17.1949 16.2609 17.4697 16.0326 17.6984C15.8039 17.9266 15.5292 18.0408 15.2083 18.0408H9.375ZM15.2083 9.29077H9.375V16.8741H15.2083V9.29077ZM10.5417 15.7074H11.7083V10.4574H10.5417V15.7074ZM12.875 15.7074H14.0417V10.4574H12.875V15.7074ZM9.375 9.29077V16.8741V9.29077Z" />
            </Icon>
          </Flex>
        ))}
      </Box>
    </Flex>
  );
};

export default FileSelect;
