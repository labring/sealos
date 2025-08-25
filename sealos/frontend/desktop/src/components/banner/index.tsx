import { Box, Center, Fade, Flex, Text, useMediaQuery } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { CurrencySymbol } from '@sealos/ui';

interface SaleBannerProps {
  isBannerVisible: boolean;
  setIsBannerVisible: (value: boolean) => void;
}

export default function SaleBanner({ isBannerVisible, setIsBannerVisible }: SaleBannerProps) {
  const [isMobileSize] = useMediaQuery('(max-width: 780px)');
  const { t } = useTranslation();

  const closeBanner = () => {
    setIsBannerVisible(false);
    const today = new Date().toLocaleDateString();
    localStorage.setItem('bannerLastClosed', today);
  };

  const goDetail = () => {
    window.open(`https://mp.weixin.qq.com/s/bnLMItoH2NVUZ_smYzhfEg`, '_blank');
  };

  if (!isBannerVisible || isMobileSize) return null;

  return (
    <Fade in={isBannerVisible}>
      <Box px={'24px'} mx={'auto'} maxW={'1290px'} pt={'8px'}>
        <Center
          height={'40px'}
          borderRadius={'6px'}
          background={'linear-gradient(90deg, #C3DEF9 0%, #D2E2FA 54%, #C3DEF9 100%)'}
          position={'relative'}
        >
          🎉
          <Text
            px={'4px'}
            fontSize={'14px'}
            fontWeight={500}
            sx={{
              background:
                'linear-gradient(90deg, #004CFF 2.89%, #684FED 15.43%, #FF53D4 50.82%, #8450E9 81.16%, #004CFF 88.51%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            {t('common:banner.title')}
          </Text>
          <Flex fontSize={'14px'} fontWeight={400} alignItems={'center'}>
            {t('common:banner.description')}
            <Text
              fontWeight={500}
              px={'4px'}
              sx={{
                background:
                  'linear-gradient(90deg, #004CFF 2.89%, #684FED 15.43%, #FF53D4 50.82%, #8450E9 81.16%, #004CFF 88.51%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              10000
            </Text>
            <CurrencySymbol />
            <Text ml={'2px'}>{t('common:banner.date')}</Text>
          </Flex>
          <Center
            ml={'20px'}
            px={'12px'}
            py={'6px'}
            borderRadius={'52px'}
            background={'linear-gradient(90deg, #1058FF 0%, #838AF1 57.5%, #FF80E6 100%)'}
            onClick={goDetail}
            cursor={'pointer'}
          >
            <Text color={'#FFF'} mr={'4px'} fontSize={'12px'} fontWeight={500}>
              {t('common:banner.button')}
            </Text>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M7.75419 3.08752C7.52638 3.31532 7.52638 3.68467 7.75419 3.91248L10.2584 6.41666H2.33333C2.01117 6.41666 1.75 6.67783 1.75 7C1.75 7.32216 2.01117 7.58333 2.33333 7.58333H10.2584L7.75419 10.0875C7.52638 10.3153 7.52638 10.6847 7.75419 10.9125C7.98199 11.1403 8.35134 11.1403 8.57915 10.9125L12.0791 7.41248C12.307 7.18467 12.307 6.81532 12.0791 6.58752L8.57915 3.08752C8.35134 2.85971 7.98199 2.85971 7.75419 3.08752Z"
                fill="white"
              />
            </svg>
          </Center>
          <Center
            ml={'auto'}
            position={'absolute'}
            right={'16px'}
            top={'11px'}
            onClick={closeBanner}
            cursor={'pointer'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3.79171 3.79176C3.53136 4.05211 3.53136 4.47422 3.79171 4.73457L7.05713 7.99999L3.7917 11.2654C3.53135 11.5258 3.53135 11.9479 3.7917 12.2082C4.05205 12.4686 4.47416 12.4686 4.73451 12.2082L7.99994 8.9428L11.2654 12.2082C11.5257 12.4686 11.9478 12.4686 12.2082 12.2082C12.4685 11.9479 12.4685 11.5258 12.2082 11.2654L8.94275 7.99999L12.2082 4.73457C12.4685 4.47422 12.4685 4.05211 12.2082 3.79176C11.9478 3.53141 11.5257 3.53141 11.2654 3.79176L7.99994 7.05718L4.73451 3.79176C4.47417 3.53141 4.05206 3.53141 3.79171 3.79176Z"
                fill="#111824"
              />
            </svg>
          </Center>
        </Center>
      </Box>
    </Fade>
  );
}
