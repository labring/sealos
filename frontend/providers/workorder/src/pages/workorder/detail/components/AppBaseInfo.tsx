import { getFileUrl } from '@/api/platform';
import { findUserById } from '@/api/user';
import { FileImgs } from '@/components/FileSelect';
import MyIcon from '@/components/Icon';
import useSessionStore from '@/store/session';
import { WorkOrderDB } from '@/types/workorder';
import { useCopyData } from '@/utils/tools';
import { Box, Flex, Icon, Tag, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';

const AppBaseInfo = ({ app }: { app: WorkOrderDB }) => {
  const { t } = useTranslation();
  const { copyData } = useCopyData();
  const { session } = useSessionStore();

  const appendixs = useMemo(() => {
    if (!app?.appendix) return [];
    return app?.appendix.map((fileName) => {
      let temp = FileImgs.find((i) => i.reg.exec(fileName));
      return {
        fileName,
        fileIcon: temp ? temp.src : FileImgs[0].src
      };
    });
  }, [app?.appendix]);

  const handleFile = async (name: string) => {
    const fileUrl = await getFileUrl({ fileName: name });
    window.open(fileUrl);
  };

  const { data: workorderInfo } = useQuery(
    ['findUserById'],
    () => findUserById({ orderId: app?.orderId || '' }),
    {
      enabled: !!app?.orderId && session?.user?.isAdmin
    }
  );

  return (
    <Box p="24px" flexDirection={'column'} fontSize={'12px'} color={'#5A646E'} fontWeight={500}>
      <Flex gap={'8px'} py="8px" alignItems={'center'}>
        <Icon
          xmlns="http://www.w3.org/2000/svg"
          width="16px"
          height="16px"
          viewBox="0 0 16 16"
          fill="#7B838B"
        >
          <g mask="url(#mask0_27_14784)">
            <path d="M2 7.33333V2H7.33333V7.33333H2ZM2 14V8.66667H7.33333V14H2ZM8.66667 7.33333V2H14V7.33333H8.66667ZM8.66667 14V8.66667H14V14H8.66667ZM3.33333 6H6V3.33333H3.33333V6ZM10 6H12.6667V3.33333H10V6ZM10 12.6667H12.6667V10H10V12.6667ZM3.33333 12.6667H6V10H3.33333V12.6667Z" />
          </g>
        </Icon>
        <Text>{t('Question Type')}</Text>
      </Flex>

      <Flex mt={'12px'}>
        <Tag
          key={app?.type}
          borderRadius={'24px'}
          mr={4}
          backgroundColor={'myWhite.400'}
          border={'1px solid '}
          borderColor={'myGray.100'}
          px={4}
          py={1}
          color={'#24282C'}
        >
          {app?.type}
        </Tag>
      </Flex>
      {appendixs?.length > 0 && (
        <Box mt="24px">
          <Flex gap={'8px'} alignItems={'center'}>
            <MyIcon name="link"></MyIcon>
            <Text>{t('appendix')}</Text>
          </Flex>
          <Flex
            flexDirection={'column'}
            mt="12px"
            gap="12px"
            py="16px"
            px="16px"
            borderRadius={'4px'}
            bg="#F8FAFB"
          >
            {appendixs?.map((item) => (
              <Flex h="22px" gap="8px" alignItems={'center'} key={item.fileName}>
                {item.fileIcon}
                <Text fontSize={'14px'} isTruncated>
                  {item.fileName}
                </Text>
                <Icon
                  xmlns="http://www.w3.org/2000/svg"
                  width="16px"
                  height="16px"
                  viewBox="0 0 16 16"
                  fill="none"
                  cursor={'pointer'}
                  onClick={() => handleFile(item.fileName)}
                >
                  <path
                    d="M7.99999 6C8.53042 6 9.03913 6.21071 9.4142 6.58579C9.78928 6.96086 9.99999 7.46957 9.99999 8C9.99999 8.53043 9.78928 9.03914 9.4142 9.41421C9.03913 9.78929 8.53042 10 7.99999 10C7.46956 10 6.96085 9.78929 6.58578 9.41421C6.2107 9.03914 5.99999 8.53043 5.99999 8C5.99999 7.46957 6.2107 6.96086 6.58578 6.58579C6.96085 6.21071 7.46956 6 7.99999 6ZM7.99999 3C11.3333 3 14.18 5.07333 15.3333 8C14.18 10.9267 11.3333 13 7.99999 13C4.66666 13 1.81999 10.9267 0.666656 8C1.81999 5.07333 4.66666 3 7.99999 3ZM2.11999 8C2.65883 9.1002 3.49553 10.0272 4.53498 10.6755C5.57442 11.3238 6.77492 11.6675 7.99999 11.6675C9.22506 11.6675 10.4256 11.3238 11.465 10.6755C12.5045 10.0272 13.3412 9.1002 13.88 8C13.3412 6.8998 12.5045 5.97283 11.465 5.3245C10.4256 4.67616 9.22506 4.33245 7.99999 4.33245C6.77492 4.33245 5.57442 4.67616 4.53498 5.3245C3.49553 5.97283 2.65883 6.8998 2.11999 8Z"
                    fill="#36ADEF"
                  />
                </Icon>
              </Flex>
            ))}
          </Flex>
        </Box>
      )}
      <Box mt="24px">
        <Flex gap={'8px'} alignItems={'center'}>
          <Icon
            xmlns="http://www.w3.org/2000/svg"
            width="16px"
            height="16px"
            viewBox="0 0 16 16"
            fill="#7B838B"
          >
            <g mask="url(#mask0_31_17130)">
              <path d="M4.66667 11.3333H9.33333V10H4.66667V11.3333ZM4.66667 8.66667H11.3333V7.33333H4.66667V8.66667ZM4.66667 6H11.3333V4.66667H4.66667V6ZM3.33333 14C2.96667 14 2.65278 13.8694 2.39167 13.6083C2.13056 13.3472 2 13.0333 2 12.6667V3.33333C2 2.96667 2.13056 2.65278 2.39167 2.39167C2.65278 2.13056 2.96667 2 3.33333 2H12.6667C13.0333 2 13.3472 2.13056 13.6083 2.39167C13.8694 2.65278 14 2.96667 14 3.33333V12.6667C14 13.0333 13.8694 13.3472 13.6083 13.6083C13.3472 13.8694 13.0333 14 12.6667 14H3.33333ZM3.33333 12.6667H12.6667V3.33333H3.33333V12.6667Z" />
            </g>
          </Icon>
          <Text>{t('Description')}</Text>
        </Flex>
        <Flex mt="12px" p={'16px'} borderRadius={'4px'} bg="#F8FAFB">
          <Text color={'#24282C'}>{app?.description} </Text>
        </Flex>
      </Box>

      {session?.user?.isAdmin && (
        <Box mt="24px">
          <Flex gap={'8px'} alignItems={'center'}>
            <Icon
              xmlns="http://www.w3.org/2000/svg"
              width="16px"
              height="16px"
              viewBox="0 0 16 16"
              fill="#7B838B"
            >
              <g mask="url(#mask0_31_17130)">
                <path d="M4.66667 11.3333H9.33333V10H4.66667V11.3333ZM4.66667 8.66667H11.3333V7.33333H4.66667V8.66667ZM4.66667 6H11.3333V4.66667H4.66667V6ZM3.33333 14C2.96667 14 2.65278 13.8694 2.39167 13.6083C2.13056 13.3472 2 13.0333 2 12.6667V3.33333C2 2.96667 2.13056 2.65278 2.39167 2.39167C2.65278 2.13056 2.96667 2 3.33333 2H12.6667C13.0333 2 13.3472 2.13056 13.6083 2.39167C13.8694 2.65278 14 2.96667 14 3.33333V12.6667C14 13.0333 13.8694 13.3472 13.6083 13.6083C13.3472 13.8694 13.0333 14 12.6667 14H3.33333ZM3.33333 12.6667H12.6667V3.33333H3.33333V12.6667Z" />
              </g>
            </Icon>
            <Text>{t('user info')}(Admin)</Text>
          </Flex>

          <Flex
            mt="12px"
            p={'16px'}
            borderRadius={'4px'}
            bg="#F8FAFB"
            flexDirection={'column'}
            color={'#24282C'}
            gap={'4px'}
            cursor={'pointer'}
          >
            <Box onClick={() => copyData(workorderInfo?.user?.userId || '')}>
              userID: {workorderInfo?.user?.userId}
            </Box>
            <Box onClick={() => copyData(workorderInfo?.user?.userCrName || '')}>
              userCrName: {workorderInfo?.user?.userCrName}
            </Box>
            <Box onClick={() => copyData(workorderInfo?.user?.workspaceId || '')}>
              workspaceId: {workorderInfo?.user?.workspaceId}
            </Box>
            <Box onClick={() => copyData(workorderInfo?.regionInfo?.sealosRegionDomain || '')}>
              region: {workorderInfo?.regionInfo?.sealosRegionDomain}
            </Box>
            <Box onClick={() => copyData(workorderInfo?.workorderLink || '')}>
              workorderLink: {workorderInfo?.workorderLink}
            </Box>
          </Flex>
        </Box>
      )}
    </Box>
  );
};

export default AppBaseInfo;
