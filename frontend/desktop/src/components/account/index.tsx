import { useCopyData } from '@/hooks/useCopyData';
import request from '@/services/request';
import useAppStore from '@/stores/app';
import { useConfigStore } from '@/stores/config';
import useSessionStore from '@/stores/session';
import { ApiResp } from '@/types';
import download from '@/utils/downloadFIle';
import { formatMoney } from '@/utils/format';
import {
  Box,
  Center,
  Flex,
  Icon,
  IconButton,
  Image,
  Stack,
  Text,
  VStack,
  useDisclosure
} from '@chakra-ui/react';
import { CopyIcon, DownloadIcon, LogoutIcon } from '@sealos/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import { blurBackgroundStyles } from '../desktop_content';
import PasswordModify from './PasswordModify';
import UserMenu from '@/components/user_menu';
import GithubComponent from './github';
import LangSelectSimple from '../LangSelect/simple';
import RegionToggle from '../region/RegionToggle';
import WorkspaceToggle from '../team/WorkspaceToggle';

const baseItemStyle = {
  w: '52px',
  h: '40px',
  background: 'rgba(255, 255, 255, 0.07)',
  color: 'white',
  borderRadius: '100px'
};

export default function Account() {
  const showDisclosure = useDisclosure();
  const { layoutConfig } = useConfigStore();
  const [showId, setShowId] = useState(true);
  const passwordEnabled = useConfigStore().authConfig?.idp?.password?.enabled;
  const rechargeEnabled = useConfigStore().commonConfig?.rechargeEnabled;
  const logo = useConfigStore().layoutConfig?.logo;
  const router = useRouter();
  const { copyData } = useCopyData();
  const openApp = useAppStore((s) => s.openApp);
  const installApp = useAppStore((s) => s.installedApps);
  const { t } = useTranslation();
  const { delSession, session, setToken } = useSessionStore();
  const user = session?.user;
  const { data } = useQuery({
    queryKey: ['getAmount', { userId: user?.userCrUid }],
    queryFn: () =>
      request<any, ApiResp<{ balance: number; deductionBalance: number }>>(
        '/api/account/getAmount'
      ),
    enabled: !!user
  });
  const balance = useMemo(() => {
    let real_balance = data?.data?.balance || 0;
    if (data?.data?.deductionBalance) {
      real_balance -= data?.data.deductionBalance;
    }
    return real_balance;
  }, [data]);
  const queryclient = useQueryClient();
  const kubeconfig = session?.kubeconfig || '';
  const logout = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    delSession();
    queryclient.clear();
    router.replace('/signin');
    setToken('');
  };

  return (
    <Flex {...blurBackgroundStyles} flex={1} px={'16px'} pt={'20px'} flexDirection={'column'}>
      <Flex>
        <Image
          width={'36px'}
          height={'36px'}
          borderRadius="full"
          src={user?.avatar || ''}
          fallbackSrc={logo}
          alt="user avator"
          mr={'10px'}
        />
        <Box>
          <Text lineHeight={'20px'} color={'white'} fontSize={'14px'} fontWeight={500}>
            {user?.name}
          </Text>
          <Flex
            cursor={'pointer'}
            gap="2px"
            fontSize={'12px'}
            lineHeight={'16px'}
            fontWeight={'500'}
            color={'rgba(255, 255, 255, 0.70)'}
            alignItems={'center'}
          >
            <Text onClick={() => setShowId((s) => !s)}>
              {showId ? `ID: ${user?.userId}` : `NS: ${user?.nsid}`}
            </Text>
            <CopyIcon
              onClick={() => {
                if (user?.userId && user.nsid) copyData(showId ? user?.userId : user?.nsid);
              }}
              boxSize={'12px'}
              fill={'rgba(255, 255, 255, 0.70)'}
            />
          </Flex>
        </Box>
        <Center ml={'auto'} cursor={'pointer'}>
          <LogoutIcon boxSize={'14px'} fill={'white'} />
          <Text ml="4px" color={'white'} fontSize={'12px'} fontWeight={500} onClick={logout}>
            {t('Log Out')}
          </Text>
        </Center>
      </Flex>

      <Flex mt={'16px'} justifyContent={'space-between'}>
        <Center cursor={'pointer'} {...baseItemStyle}>
          <Icon
            xmlns="http://www.w3.org/2000/svg"
            width="21px"
            height="20px"
            viewBox="0 0 21 20"
            fill="none"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M10.6247 2.81193C9.96309 2.81193 9.42672 3.3483 9.42672 4.00993C9.42672 4.18651 9.46461 4.35374 9.53298 4.5044C9.89085 4.44143 10.2565 4.40927 10.6247 4.40927C10.993 4.40927 11.3586 4.44143 11.7165 4.5044C11.7848 4.35374 11.8227 4.18651 11.8227 4.00993C11.8227 3.3483 11.2864 2.81193 10.6247 2.81193ZM13.2449 4.98549C13.3581 4.68167 13.4201 4.35287 13.4201 4.00993C13.4201 2.46611 12.1685 1.2146 10.6247 1.2146C9.0809 1.2146 7.82939 2.46611 7.82939 4.00993C7.82939 4.35287 7.89136 4.68167 8.00455 4.98549C7.53661 5.20494 7.10096 5.48473 6.71319 5.8208C5.65525 6.73768 5.03405 8.00783 5.03405 9.361C5.03405 11.0443 4.61854 12.2361 4.12939 13.0634L4.12128 13.0771C3.80675 13.609 3.5611 14.0245 3.39633 14.3227C3.31398 14.4718 3.24151 14.6099 3.18883 14.7282C3.1627 14.7869 3.13388 14.8574 3.11143 14.9322C3.09468 14.9879 3.05348 15.1325 3.07062 15.3078C3.08002 15.4041 3.10161 15.5952 3.21289 15.7903C3.32417 15.9853 3.4777 16.1012 3.55575 16.1583C3.68293 16.2513 3.8102 16.2912 3.87358 16.3087C3.94839 16.3294 4.02108 16.3417 4.08135 16.3497C4.20185 16.3659 4.34216 16.3741 4.48841 16.3792C4.77993 16.3893 5.18754 16.3893 5.70115 16.3893H7.5307C7.88534 17.7672 9.13614 18.7853 10.6247 18.7853C12.1133 18.7853 13.3641 17.7672 13.7187 16.3893H15.5483C16.0619 16.3893 16.4695 16.3893 16.761 16.3792C16.9073 16.3741 17.0476 16.3659 17.1681 16.3497C17.2284 16.3417 17.3011 16.3294 17.3759 16.3087C17.4392 16.2912 17.5665 16.2513 17.6937 16.1583C17.7717 16.1012 17.9253 15.9853 18.0366 15.7903C18.1478 15.5952 18.1694 15.4041 18.1788 15.3078C18.196 15.1325 18.1548 14.9879 18.138 14.9322C18.1156 14.8574 18.0867 14.7869 18.0606 14.7282C18.0079 14.6099 17.9355 14.4718 17.8531 14.3227C17.6883 14.0245 17.4427 13.609 17.1281 13.077L17.1201 13.0634C16.6309 12.2361 16.2154 11.0443 16.2154 9.361C16.2154 8.00783 15.5942 6.73768 14.5363 5.8208C14.1485 5.48473 13.7128 5.20494 13.2449 4.98549ZM11.834 6.16481C11.8442 6.16777 11.8543 6.17053 11.8645 6.17309C12.479 6.34249 13.0377 6.63576 13.4901 7.02788C14.2295 7.6687 14.6181 8.51125 14.6181 9.361C14.6181 11.3225 15.1064 12.7963 15.7451 13.8764C15.9648 14.2479 16.1429 14.5491 16.2821 14.7903C16.075 14.7919 15.8264 14.7919 15.53 14.7919H5.71946C5.42304 14.7919 5.1744 14.7919 4.96732 14.7903C5.10659 14.5491 5.28465 14.2479 5.50434 13.8764C6.14302 12.7963 6.63139 11.3225 6.63139 9.361C6.63139 8.51125 7.01993 7.6687 7.75934 7.02788C8.21179 6.63576 8.7704 6.34249 9.38493 6.17309C9.39513 6.17054 9.40529 6.16777 9.41541 6.16481C9.80105 6.06138 10.2083 6.0066 10.6247 6.0066C11.0412 6.0066 11.4484 6.06138 11.834 6.16481ZM9.24108 16.3893C9.51727 16.8667 10.0335 17.1879 10.6247 17.1879C11.216 17.1879 11.7322 16.8667 12.0084 16.3893H9.24108Z"
              fill="white"
            />
          </Icon>
        </Center>

        <LangSelectSimple {...baseItemStyle} />
        {layoutConfig?.common.githubStarEnabled && <GithubComponent {...baseItemStyle} />}
        {layoutConfig?.common.githubStarEnabled && (
          <Center cursor={'pointer'} {...baseItemStyle}>
            <Icon
              xmlns="http://www.w3.org/2000/svg"
              width="21px"
              height="20px"
              viewBox="0 0 21 20"
              fill="none"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M4.7261 2.80542L5.11222 2.80542C5.96437 2.80541 6.65736 2.8054 7.21974 2.85135C7.8006 2.89881 8.31938 2.99965 8.80206 3.24559C9.31758 3.50826 9.7677 3.87706 10.1248 4.32437C10.4819 3.87706 10.932 3.50826 11.4475 3.24559C11.9302 2.99965 12.449 2.89881 13.0298 2.85135C13.5922 2.8054 14.2852 2.80541 15.1373 2.80542L15.5235 2.80542C15.937 2.8054 16.2992 2.80539 16.5986 2.82985C16.9163 2.85581 17.2402 2.91365 17.5541 3.07359C18.0171 3.30948 18.3935 3.68588 18.6293 4.14883C18.7893 4.46273 18.8471 4.78664 18.8731 5.10436C18.8975 5.40377 18.8975 5.76596 18.8975 6.17945V13.8207C18.8975 14.2342 18.8975 14.5964 18.8731 14.8958C18.8471 15.2135 18.7893 15.5374 18.6293 15.8513C18.3935 16.3143 18.0171 16.6907 17.5541 16.9266C17.2402 17.0865 16.9163 17.1443 16.5986 17.1703C16.2991 17.1948 15.937 17.1947 15.5234 17.1947H4.72612C4.31261 17.1947 3.95041 17.1948 3.65099 17.1703C3.33327 17.1443 3.00936 17.0865 2.69546 16.9266C2.23251 16.6907 1.85611 16.3143 1.62022 15.8513C1.46028 15.5374 1.40244 15.2135 1.37648 14.8958C1.35202 14.5964 1.35203 14.2342 1.35205 13.8207V6.17947C1.35203 5.76597 1.35202 5.40378 1.37648 5.10436C1.40244 4.78664 1.46028 4.46273 1.62022 4.14883C1.85611 3.68588 2.23251 3.30948 2.69546 3.07359C3.00936 2.91365 3.33327 2.85581 3.65099 2.82985C3.95041 2.80539 4.3126 2.8054 4.7261 2.80542ZM9.24244 8.73761C9.24244 7.83924 9.24176 7.21853 9.20237 6.7365C9.16383 6.26477 9.09267 6.00408 8.99461 5.81163C8.77661 5.38378 8.42876 5.03593 8.00092 4.81793C7.80846 4.71987 7.54777 4.64871 7.07604 4.61017C6.59401 4.57079 5.9733 4.5701 5.07493 4.5701H4.75932C4.30285 4.5701 4.01357 4.57079 3.79469 4.58867C3.58611 4.60571 3.52028 4.63387 3.49661 4.64593C3.3657 4.71263 3.25926 4.81907 3.19256 4.94998C3.1805 4.97365 3.15234 5.03947 3.1353 5.24806C3.11742 5.46694 3.11673 5.75622 3.11673 6.21269V13.7875C3.11673 14.2439 3.11742 14.5332 3.1353 14.7521C3.15234 14.9607 3.1805 15.0265 3.19256 15.0502C3.25926 15.1811 3.3657 15.2875 3.49661 15.3542C3.52028 15.3663 3.58611 15.3944 3.79469 15.4115C4.01357 15.4294 4.30285 15.43 4.75932 15.43H9.24244V8.73761ZM11.0071 15.43V8.73761C11.0071 7.83924 11.0078 7.21853 11.0472 6.7365C11.0857 6.26477 11.1569 6.00408 11.255 5.81163C11.473 5.38378 11.8208 5.03593 12.2486 4.81793C12.4411 4.71987 12.7018 4.64871 13.1735 4.61017C13.6556 4.57079 14.2763 4.5701 15.1746 4.5701H15.4902C15.9467 4.5701 16.236 4.57079 16.4549 4.58867C16.6635 4.60571 16.7293 4.63387 16.753 4.64593C16.8839 4.71263 16.9903 4.81907 17.057 4.94998C17.0691 4.97365 17.0972 5.03947 17.1143 5.24806C17.1321 5.46694 17.1328 5.75622 17.1328 6.21269V13.7875C17.1328 14.2439 17.1321 14.5332 17.1143 14.7521C17.0972 14.9607 17.0691 15.0265 17.057 15.0502C16.9903 15.1811 16.8839 15.2875 16.753 15.3542C16.7293 15.3663 16.6635 15.3944 16.4549 15.4115C16.236 15.4294 15.9467 15.43 15.4902 15.43H11.0071Z"
                fill="white"
              />
            </Icon>
          </Center>
        )}
      </Flex>

      <RegionToggle />

      <WorkspaceToggle />

      <UserMenu />

      <Flex mt="8px" justifyContent={'center'} alignItems={'center'} flexDirection={'column'}>
        <VStack w={'full'} gap={'12px'}>
          <Stack
            direction={'column'}
            width={'100%'}
            bg="rgba(255, 255, 255, 0.6)"
            borderRadius={'8px'}
            fontSize={'13px'}
            gap={'0px'}
          >
            {passwordEnabled && (
              <Flex
                justify={'space-between'}
                alignItems={'center'}
                borderBottom={'1px solid #0000001A'}
                px="16px"
                py="11px"
              >
                <Text>{t('changePassword')}</Text>
                <PasswordModify mr="0" />
              </Flex>
            )}
            <Flex px="16px" py="11px" alignItems={'center'} borderBottom={'1px solid #0000001A'}>
              <Text>
                {t('Balance')}: {formatMoney(balance).toFixed(2)}
              </Text>
              {rechargeEnabled && (
                <Box
                  ml="auto"
                  onClick={() => {
                    const costcenter = installApp.find((t) => t.key === 'system-costcenter');
                    if (!costcenter) return;
                    openApp(costcenter, {
                      query: {
                        openRecharge: 'true'
                      }
                    });
                    // disclosure.onClose();
                  }}
                  _hover={{
                    bgColor: 'rgba(0, 0, 0, 0.03)'
                  }}
                  transition={'0.3s'}
                  p="4px"
                  color={'#219BF4'}
                  fontWeight="500"
                  fontSize="12px"
                  cursor={'pointer'}
                >
                  {t('Charge')}
                </Box>
              )}
            </Flex>
            {
              <Flex alignItems={'center'} px="16px" py="11px">
                <Text>kubeconfig</Text>

                <IconButton
                  variant={'white-bg-icon'}
                  p="4px"
                  ml="auto"
                  mr="4px"
                  onClick={() => kubeconfig && download('kubeconfig.yaml', kubeconfig)}
                  icon={<DownloadIcon boxSize={'16px'} color={'#219BF4'} fill={'#219BF4'} />}
                  aria-label={'Download kc'}
                />
                <IconButton
                  variant={'white-bg-icon'}
                  p="4px"
                  onClick={() => kubeconfig && copyData(kubeconfig)}
                  icon={<CopyIcon boxSize={'16px'} color={'#219BF4'} fill={'#219BF4'} />}
                  aria-label={'copy kc'}
                />
              </Flex>
            }
          </Stack>
        </VStack>
      </Flex>
    </Flex>
  );
}
