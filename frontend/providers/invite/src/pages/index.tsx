import type React from 'react';

import {
  Box,
  Button,
  Flex,
  Grid,
  Icon,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  Skeleton,
  Center,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Divider,
  FlexProps,
  Image,
  Link
} from '@chakra-ui/react';
import { useState } from 'react';
import { CheckCheck, ClockIcon, CopyIcon, DownloadIcon, GiftIcon, UserIcon } from 'lucide-react';
import { formatTime, useCopyData } from '@/utils/tools';
import useSessionStore from '@/store/session';
import { useTranslation } from 'next-i18next';
import { useQuery } from '@tanstack/react-query';
import { getInvitationIno } from '@/api/account';
import { serviceSideProps } from '@/utils/i18n';
import ExcelJS from 'exceljs';

export default function InvitationPage({
  SEALOS_DOMAIN,
  GIFT_RATIO,
  INVITER_REWARD
}: {
  SEALOS_DOMAIN: string;
  GIFT_RATIO: string;
  INVITER_REWARD: string;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { copyData } = useCopyData();
  const userInfo = useSessionStore((state) => state?.session?.user);
  const { t, i18n } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading } = useQuery(
    ['getPromotionInitData', userInfo?.id, page, pageSize],
    () =>
      getInvitationIno({
        inviterId: userInfo?.id || '',
        page: page.toString(),
        pageSize: pageSize.toString()
      }),
    {
      refetchInterval: 5 * 60 * 1000,
      keepPreviousData: true
    }
  );

  const invitationData = data || {
    totalPeople: 0,
    totalAmount: 0,
    completedUsers: 0,
    pendingUsers: 0,
    rewardList: [],
    pagination: {
      total: 0,
      currentPage: 1,
      pageSize: 10,
      totalPages: 0
    }
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);

      const data = await getInvitationIno({
        inviterId: userInfo?.id || '',
        page: '1',
        pageSize: '5000'
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`邀请记录`);

      worksheet.columns = [
        { header: '序号', key: 'serial', width: 10 },
        { header: 'ID', key: 'invitee', width: 20 },
        { header: '注册时间', key: 'registerTime', width: 20 },
        { header: '奖励状态', key: 'status', width: 15 },
        { header: '完成时间', key: 'arrival_time', width: 20 },
        { header: '金额', key: 'amount', width: 10 }
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = { horizontal: 'center' };

      data.rewardList.forEach((item, index) => {
        worksheet.addRow({
          serial: index + 1,
          invitee: item.invitee,
          registerTime: formatTime(item.registerTime),
          status: item.status === 'completed' ? '已完成' : '进行中',
          arrival_time: item.arrival_time ? formatTime(item.arrival_time) : '--',
          amount: `+${item.amount}`
        });
      });

      worksheet.getColumn(1).alignment = { horizontal: 'center' };
      worksheet.getColumn(4).alignment = { horizontal: 'center' };
      worksheet.getColumn(6).alignment = { horizontal: 'right' };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `邀请记录_${formatTime(new Date(), 'YYYYMMDD')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('export excel failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // useEffect(() => {
  //   i18n.changeLanguage('zh');
  // }, []);

  return (
    <Flex
      flexDirection="column"
      py={'40px'}
      px={'56px'}
      position="relative"
      overflowY={'auto'}
      bg={'linear-gradient(180deg, #FAFAFA 0%, #FAFAFA 100%)'}
      h={'100vh'}
    >
      <Flex justifyContent="space-between" alignItems="center">
        <Box>
          <Text fontSize="24px" fontWeight="600">
            {t('invite_friends_title')}
          </Text>
          <Text mt={1} fontSize={'18px'} fontWeight={'400'} color={'#52525B'}>
            <span
              dangerouslySetInnerHTML={{
                __html: t('friend_certification_text', { amount: INVITER_REWARD })
              }}
            />
            {t('balance_reward')}
            <Link onClick={onOpen} color={'#2563EB'} fontWeight={'bold'}>
              {t('click_to_get')}
            </Link>
          </Text>
        </Box>
        {/* <Center
          fontSize={'14px'}
          fontWeight={'500'}
          height="40px"
          padding="8px 16px"
          display="flex"
          gap="8px"
          borderRadius="8px"
          bg="#FFF"
          boxShadow="0px 1px 2px 0px rgba(0, 0, 0, 0.05)"
          border={'1px solid #E4E4E7'}
          cursor={'pointer'}
          onClick={onOpen}
        >
          <Icon as={GiftIcon} boxSize={4} color={'#2563EB'} />
          {t('activity_subsidy')}
        </Center> */}
      </Flex>

      <Flex py={'36px'} gap={'46px'} alignItems={'center'}>
        <Box fontSize={'16px'} fontWeight={400}>
          <Text color={'#71717A'}>{t('total_earnings')}</Text>
          <Center mt={'10px'} color={'#18181B'} fontSize={'20px'} gap={'4px'} lineHeight={'20px'}>
            <Image src="/sealos.svg" alt="icon" w={'18px'} h={'18px'} />
            <Text>{isLoading ? t('loading') : invitationData.totalAmount.toString()}</Text>
          </Center>
        </Box>
        <Divider h={'40px'} orientation="vertical" borderColor={'#E4E4E7'} />
        <Box fontSize={'16px'} fontWeight={400}>
          <Text color={'#71717A'}>{t('invitation_code')}</Text>
          <Center mt={'10px'} color={'#18181B'} fontSize={'20px'} gap={'4px'} lineHeight={'20px'}>
            <Text>{userInfo?.id || ''}</Text>
            <Icon
              size={'20px'}
              color={'#737373'}
              as={CopyIcon}
              boxSize={5}
              cursor="pointer"
              onClick={() => copyData(userInfo?.id || '')}
            />
          </Center>
        </Box>
        <Divider h={'40px'} orientation="vertical" borderColor={'#E4E4E7'} />
        <Box fontSize={'16px'} fontWeight={400}>
          <Text color={'#71717A'}>{t('Invitation link')}</Text>
          <Center mt={'10px'} color={'#18181B'} fontSize={'20px'} gap={'8px'} lineHeight={'20px'}>
            <Text>{`https://${SEALOS_DOMAIN}/?uid=${userInfo?.id || ''}`}</Text>
            <Icon
              size={'20px'}
              color={'#737373'}
              as={CopyIcon}
              boxSize={5}
              cursor="pointer"
              onClick={() => copyData(`https://${SEALOS_DOMAIN}/?uid=${userInfo?.id || ''}`)}
            />
          </Center>
        </Box>
      </Flex>

      <Grid templateColumns={['1fr', 'repeat(3,1fr)']} gap={5}>
        <UserStatBox
          title={t('Cumulative number of invitees')}
          count={isLoading ? 0 : invitationData.totalPeople}
          icon={<UserIcon size={20} color="#2563EB" />}
          iconBoxProps={{ bg: '#EFF6FF', border: '1px solid #BFDBFE' }}
        />
        <UserStatBox
          title={t('completed_users')}
          count={isLoading ? 0 : invitationData.completedUsers}
          icon={<CheckCheck size={20} color="#059669" />}
          iconBoxProps={{ bg: '#ECFDF5', border: '1px solid #A7F3D0' }}
        />
        <UserStatBox
          title={t('pending_users')}
          count={isLoading ? 0 : invitationData.pendingUsers}
          icon={<ClockIcon size={20} color="#CA8A04" />}
          iconBoxProps={{ bg: '#FEFCE8', border: '1px solid #FEF08A' }}
        />
      </Grid>

      {/* User List */}
      <Box mt={'16px'} p={'24px'} border="1px solid #E4E4E7" borderRadius="16px" bg={'#FFF'}>
        <Flex justifyContent="space-between" alignItems="center" mb={4}>
          <Text fontWeight="500" fontSize={'18px'}>
            {t('user_list')}
          </Text>
          <Button
            rightIcon={<DownloadIcon color="#737373" size={16} />}
            variant="outline"
            border={'1px solid #E4E4E7'}
            borderRadius={'8px'}
            fontSize={'14px'}
            color={'#18181B'}
            onClick={handleExportExcel}
            isLoading={isExporting}
          >
            {t('export_excel')}
          </Button>
        </Flex>

        <TableContainer position="relative" overflow="hidden" minH="100px">
          <Table variant="unstyled">
            <Thead bg="#FAFAFA">
              <Tr>
                <Th>{t('serial_number')}</Th>
                <Th>ID</Th>
                <Th>{t('registration_time')}</Th>
                <Th>
                  <Flex gap="4px" alignItems="center">
                    <Text>{t('reward_status')}</Text>
                  </Flex>
                </Th>
                <Th>{t('completion_time')}</Th>
                <Th>{t('Amount')}</Th>
              </Tr>
            </Thead>
            <Tbody fontSize="sm">
              {isLoading
                ? Array(5)
                    .fill(0)
                    .map((_, index) => (
                      <Tr key={index}>
                        <Td>
                          <Skeleton height="20px" width="20px" />
                        </Td>
                        <Td>
                          <Skeleton height="20px" width="80px" />
                        </Td>
                        <Td>
                          <Skeleton height="20px" width="100px" />
                        </Td>
                        <Td>
                          <Skeleton height="20px" width="80px" />
                        </Td>
                        <Td>
                          <Skeleton height="20px" width="100px" />
                        </Td>
                        <Td>
                          <Skeleton height="20px" width="40px" />
                        </Td>
                      </Tr>
                    ))
                : invitationData.rewardList.map((item, index) => {
                    const offset = (page - 1) * pageSize;
                    return (
                      <Tr key={index} borderBottom={'1px solid #F1F1F3'}>
                        <Td>{offset + index + 1}</Td>
                        <Td color={'#52525B'}>{item.invitee}</Td>
                        <Td color={'#52525B'}>
                          {formatTime(item.registerTime, 'YYYY-MM-DD HH:mm')}
                        </Td>
                        <Td>
                          {item.status === 'completed' ? (
                            <Flex
                              alignItems="center"
                              color={'#10B981'}
                              fontSize={'14px'}
                              fontWeight={500}
                            >
                              <Box w={'8px'} h={'8px'} borderRadius="2px" bg="#10B981" mr={2} />
                              <Text>{t('completed')}</Text>
                            </Flex>
                          ) : (
                            <Flex
                              alignItems="center"
                              color={'#EAB308'}
                              fontSize={'14px'}
                              fontWeight={500}
                            >
                              <Box w={'8px'} h={'8px'} borderRadius="2px" bg="#EAB308" mr={2} />
                              <Text>{t('in_progress')}</Text>
                            </Flex>
                          )}
                        </Td>
                        <Td color={'#52525B'}>
                          {item.arrival_time
                            ? formatTime(item.arrival_time, 'YYYY-MM-DD HH:mm')
                            : '--'}
                        </Td>
                        <Td color="#2563EB">+{item.amount}</Td>
                      </Tr>
                    );
                  })}
            </Tbody>
          </Table>

          {invitationData.pagination && (
            <Flex justifyContent="flex-end" m={4}>
              <Flex>
                <Button
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  isDisabled={page <= 1 || isLoading}
                  mr={2}
                >
                  {t('previous_page')}
                </Button>
                <Text alignSelf="center" mx={2}>
                  {page} / {invitationData.pagination.totalPages || 1}
                </Text>
                <Button
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  isDisabled={page >= (invitationData.pagination.totalPages || 1) || isLoading}
                  ml={2}
                >
                  {t('next_page')}
                </Button>
              </Flex>
            </Flex>
          )}
        </TableContainer>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent maxW="500px">
          <ModalHeader display="flex" alignItems="center" h={'24px'}>
            <Icon as={GiftIcon} boxSize={5} color="#2563EB" mr={2} />
            <Text fontSize={'14px'}>{t('activity_subsidy')}</Text>
          </ModalHeader>
          <Divider />
          <ModalCloseButton />

          <ModalBody py={'24px'} px={'36px'}>
            <Text fontWeight="600" color={'#18181B'} fontSize="14px" mb={'16px'}>
              {t('activity_subsidy_text')}
            </Text>

            <Flex mb={2} p={'16px'}>
              <Box flex="1" color={'#18181B'} fontSize={'14px'} fontWeight={400}>
                {t('invite_number')}
              </Box>
              <Box flex="1" color={'#18181B'} fontSize={'14px'} fontWeight={400}>
                {t('invite_number_text')}
              </Box>
            </Flex>
            <Divider />

            <Flex p={'16px'}>
              <Box flex="1">{t('invite_number_text_1')}</Box>
              <Box flex="1">{t('invite_number_text_2')}</Box>
            </Flex>
            <Divider />

            <Flex p={'16px'}>
              <Box flex="1">{t('invite_number_text_3')}</Box>
              <Box flex="1">{t('invite_number_text_4')}</Box>
            </Flex>
            <Divider />

            <Flex p={'16px'}>
              <Box flex="1">{t('invite_number_text_5')}</Box>
              <Box flex="1">{t('invite_number_text_6')}</Box>
            </Flex>

            <Text fontWeight="600" fontSize="14px" mt={'32px'} mb={'12px'} color={'#18181B'}>
              {t('balance_reward')}
            </Text>
            <Text fontSize="14px" mb={'12px'} color={'#000'}>
              {t('balance_reward_text')}
            </Text>
            <Text fontSize="14px" color={'#71717A'} mb={'12px'}>
              {t('invite_example')}
            </Text>

            <Button
              width="100%"
              variant="outline"
              mt={'20px'}
              height="45px"
              borderRadius="8px"
              border={'1px solid #E4E4E7'}
              color={'#18181B'}
              fontSize={'14px'}
              fontWeight={'500'}
              onClick={() =>
                window.open(
                  'https://fael3z0zfze.feishu.cn/wiki/CMj0wZY49iXwdukdjLGcGjMcnof',
                  '_blank'
                )
              }
            >
              {t('apply_now')}
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
}

// User Statistics Box Component
function UserStatBox({
  title,
  count,
  icon,
  iconBoxProps
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  iconBoxProps?: FlexProps;
}) {
  return (
    <Box p={'24px'} border="1px solid #E4E4E7" borderRadius="16px" bg={'#FFF'}>
      <Text color="#71717A" mb={'8px'}>
        {title}
      </Text>
      <Flex justifyContent="space-between" alignItems="center" h={'30px'}>
        <Text fontSize="30px" fontWeight="600">
          {count} {title.includes('invitees') ? '' : '个'}
        </Text>
        <Flex
          w="40px"
          h="40px"
          borderRadius="8px"
          alignItems="center"
          justifyContent="center"
          {...iconBoxProps}
        >
          {icon}
        </Flex>
      </Flex>
    </Box>
  );
}

export async function getServerSideProps(content: any) {
  const SEALOS_DOMAIN = process.env.SEALOS_DOMAIN || 'cloud.sealos.run';
  const GIFT_RATIO = process.env.GIFT_RATIO || '0.1';
  const INVITER_REWARD = process.env.NEXT_PUBLIC_INVITER_REWARD || '5';

  return {
    props: {
      ...(await serviceSideProps(content)),
      SEALOS_DOMAIN,
      GIFT_RATIO,
      INVITER_REWARD
    }
  };
}
