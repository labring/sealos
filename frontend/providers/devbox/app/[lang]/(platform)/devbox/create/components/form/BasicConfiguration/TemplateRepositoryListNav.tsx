import MyIcon from '@/components/Icon';
import { TemplateState } from '@/constants/template';
import { useTemplateStore } from '@/stores/template';
import { Box, Flex, Text } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n';

const TemplateRepositoryListNav = () => {
  const t = useTranslations();
  const { openTemplateModal, config, isOpen } = useTemplateStore();
  const lastRoute = usePathname();
  return (
    <Flex
      // margin="0 auto"
      // width="168px"
      height="18px"
      gap="12px"
      alignItems="center"
    >
      {/* All Templates Tab */}
      <Flex
        alignItems="center"
        justifyContent="center"
        height="18px"
        borderRadius="6px"
        gap="4px"
        cursor="pointer"
        onClick={() => {
          openTemplateModal({
            templateState: TemplateState.publicTemplate,
            lastRoute
          });
        }}
      >
        <MyIcon
          name={'templateTitle'}
          width="18px"
          height="18px"
          color="#0884DD"
          fill={'#0884DD'}
        />
        <Text
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight="500"
          lineHeight="16px"
          letterSpacing="0.5px"
          color="#485264"
        >
          {t('all_templates')}
        </Text>
      </Flex>

      {/* Divider */}
      <Box width="12px" height="0" border="1px solid #DFE2EA" transform="rotate(90deg)" />

      {/* My Templates Tab */}
      <Flex
        alignItems="center"
        justifyContent="center"
        height="18px"
        borderRadius="6px"
        gap="4px"
        cursor="pointer"
        onClick={() => {
          openTemplateModal({
            templateState: TemplateState.privateTemplate,
            lastRoute
          });
        }}
      >
        <MyIcon name={'user'} width="18px" height="18px" color="#0884DD" />
        <Text
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight="500"
          lineHeight="16px"
          letterSpacing="0.5px"
          color="#485264"
        >
          {t('my_templates')}
        </Text>
      </Flex>
    </Flex>
  );
};

export default TemplateRepositoryListNav;
