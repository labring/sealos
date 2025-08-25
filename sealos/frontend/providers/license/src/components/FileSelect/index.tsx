import { useLoading } from '@/hooks/useLoading';
import { useSelectFile } from '@/hooks/useSelectFile';
import { useToast } from '@/hooks/useToast';
import { readTxtContent } from '@/utils/file';
import { Flex, Icon, Text, type BoxProps, Box } from '@chakra-ui/react';
import { customAlphabet } from 'nanoid';
import { useTranslation } from 'next-i18next';
import { DragEvent, useCallback, useState } from 'react';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 12);
const fileImgs = [
  {
    reg: /yaml/gi,
    src: (
      <Icon viewBox="0 0 16 17" fill="#7B838B">
        <path d="M9.33334 2.12411H4.00001C3.26667 2.12411 2.67334 2.72411 2.67334 3.45745L2.66667 14.1241C2.66667 14.8574 3.26 15.4574 3.99334 15.4574H12C12.7333 15.4574 13.3333 14.8574 13.3333 14.1241V6.12411L9.33334 2.12411ZM4.00001 14.1241V3.45745H8.66667V6.79078H12V14.1241H4.00001Z" />
      </Icon>
    )
  }
];
export type FileItemType = {
  id: string;
  filename: string;
  text: string;
  icon: JSX.Element;
};
interface Props extends BoxProps {
  fileExtension: string;
  files: FileItemType[];
  setFiles: React.Dispatch<React.SetStateAction<FileItemType[]>>;
  multiple: boolean;
}

const FileSelect = ({ fileExtension, setFiles, files, multiple, ...props }: Props) => {
  const { Loading: FileSelectLoading } = useLoading();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [selecting, setSelecting] = useState(false);

  const { File, onOpen } = useSelectFile({
    fileType: fileExtension,
    multiple: multiple
  });

  const onSelectFile = useCallback(
    async (files: File[]) => {
      setSelecting(true);
      try {
        // Parse file by file
        let promise = Promise.resolve<FileItemType[]>([]);
        files.forEach((file) => {
          promise = promise.then(async (result) => {
            const extension = file?.name?.split('.')?.pop()?.toLowerCase();

            /* text file */
            const hardcodedRegex = /yaml/gi;
            const icon = fileImgs.find((item) => hardcodedRegex.test(file.name))?.src;
            let text = await (async () => {
              switch (extension) {
                case 'yaml':
                  return readTxtContent(file);
              }
              return '';
            })();

            if (!icon) return result;

            if (text) {
              const fileItem: FileItemType = {
                id: nanoid(),
                filename: file.name,
                icon,
                text
              };
              return [fileItem].concat(result);
            }

            return result;
          });
        });

        const chunkFiles = await promise;

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
    <Flex
      mt="24px"
      position={'relative'}
      bg={'white'}
      justifyContent={'center'}
      alignItems={'center'}
      h="132px"
      borderRadius={'8px'}
      border={'1px dashed #C4CBD7'}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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
        {t('Upload Token File')}
      </Text>
      <Box
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

      <FileSelectLoading loading={selecting} fixed={false} />
      <File onSelect={onSelectFile} />
    </Flex>
  );
};

export default FileSelect;
