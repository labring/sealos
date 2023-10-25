import { Box, Flex, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { QRCodeSVG } from 'qrcode.react';

export default function WechatPayment(props: {
  complete: number;
  codeURL?: string;
  tradeNO?: string;
}) {
  const { t } = useTranslation();
  return (
    <Flex
      flexDirection="column"
      px="37px"
      py="60px"
      justify={'center'}
      align={'center'}
      display={'flex'}
      justifyContent={'center'}
      alignItems={'center'}
      position={'relative'}
    >
      <Flex
        width={'267px'}
        height={'295px'}
        direction={'column'}
        align="center"
        justify={'space-between'}
      >
        <Text color="#7B838B" mb="8px" textAlign="center">
          {t('Scan with WeChat')}
        </Text>
        {props.complete === 2 && !!props.codeURL ? (
          <QRCodeSVG
            size={185}
            value={props.codeURL}
            style={{ margin: '0 auto' }}
            imageSettings={{
              // 二维码中间的logo图片
              src: 'images/pay_wechat.svg',
              height: 40,
              width: 40,
              excavate: true // 中间图片所在的位置是否镂空
            }}
          />
        ) : (
          <Box>waiting...</Box>
        )}
        <Box mt="8px">
          <Text color="#717D8A" fontSize="12px" fontWeight="normal">
            {t('Order Number')}： {props.tradeNO || ''}
          </Text>
          <Text color="#717D8A" fontSize="12px">
            {t('Payment Result')}:{props.complete === 3 ? t('Payment Successful') : t('In Payment')}
          </Text>
        </Box>
      </Flex>
    </Flex>
  );
}
