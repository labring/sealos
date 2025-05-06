import { Box, Flex, Text, Badge, Button, VStack, HStack, Img } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import sparkIcon from '@/assert/sparkles.png';
import giftIcon from '@/assert/gift.png';
interface ActivityProps {
  type: 'limited' | 'longTerm';
  title: string;
  period: string;
  description: string;
  // 重点
  focusDescription: string;
}

const ActivityCard = ({ type, title, period, description, focusDescription }: ActivityProps) => {
  const { t } = useTranslation('common');

  return (
    <Box
      boxSizing="border-box"
      display="flex"
      flexDirection="row"
      alignItems="flex-start"
      padding="14px"
      gap="12px"
      width="458px"
      background={type === 'limited' ? '#F5F6FF' : '#F5FBFF'}
      border="0.5px solid #DFE2EA"
      borderRadius="12px"
    >
      <Flex
        display="flex"
        flexDirection="row"
        alignItems="center"
        padding="4px"
        gap="10px"
        width="28px"
        height="28px"
        background="#FFFFFF"
        boxShadow="0px 1px 2px rgba(19, 51, 107, 0.1), 0px 0px 1px rgba(19, 51, 107, 0.15)"
        borderRadius="8px"
      >
        {/* Icon - would be imported from a library in a real implementation */}
        {/* <Box width="20px" height="20px" /> */}
        <Img src={type === 'limited' ? sparkIcon.src : giftIcon.src} boxSize={'20px'}></Img>
      </Flex>

      <VStack
        display="flex"
        flexDirection="column"
        alignItems="flex-start"
        padding="0px"
        gap="4px"
        width="382px"
        // height="48px"
      >
        <HStack
          display="flex"
          flexDirection="row"
          alignItems="center"
          padding="0px"
          gap="8px"
          width="382px"
          // height="24px"
        >
          <Text
            // width="65px"
            // height="24px"
            fontFamily="'PingFang SC'"
            fontStyle="normal"
            fontWeight={500}
            fontSize="16px"
            lineHeight="24px"
            display="flex"
            alignItems="center"
            letterSpacing="0.15px"
            color="#000000"
          >
            {type === 'limited' ? t('limitedActivity') : t('longTermActivity')}
          </Text>

          <Badge
            // width="58px"
            // height="16px"
            // position="absolute"
            // left="73px"
            // top="4px"
            fontFamily="'PingFang SC'"
            fontStyle="normal"
            fontWeight={400}
            fontSize="12px"
            lineHeight="16px"
            display="flex"
            bgColor={'unset'}
            alignItems="center"
            letterSpacing="0.004em"
            color="#6F5DD7"
          >
            {period}
          </Badge>
        </HStack>
        <Text
          fontFamily="'PingFang SC'"
          fontStyle="normal"
          fontWeight={500}
          fontSize="14px"
          lineHeight="20px"
          // display="inline-flex"
          // alignItems="center"
          letterSpacing="0.25px"
          color={type === 'longTerm' ? 'brightBlue.500' : 'adora.600'}
        >
          {focusDescription}

          <Text
            as={'span'}
            fontFamily="'PingFang SC'"
            fontStyle="normal"
            fontWeight={500}
            fontSize="14px"
            lineHeight="20px"
            // display="inline-flex"
            // alignItems="center"
            letterSpacing="0.25px"
            color="grayModern.500"
          >
            {description}
          </Text>
        </Text>
      </VStack>
    </Box>
  );
};

export default function Activities() {
  const { t } = useTranslation('common');

  return (
    <Flex
      display="flex"
      flexDirection="column"
      alignItems="flex-start"
      padding="0px"
      gap="12px"
      width="458px"
    >
      <ActivityCard
        type="limited"
        title={t('limitedActivity')}
        period="4.22-4.28"
        focusDescription={t('limitedTitle')}
        description={t('limitedDescription')}
      />
      <ActivityCard
        type="longTerm"
        title={t('longTermActivity')}
        period=""
        focusDescription={t('longTermTitle')}
        description={t('longTermDescription')}
      />
    </Flex>
  );
}
