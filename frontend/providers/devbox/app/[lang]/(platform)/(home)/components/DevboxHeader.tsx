import MyIcon from "@/components/Icon";
import { TemplateState } from "@/constants/template";
import { useRouter } from "@/i18n";
import { useTemplateStore } from "@/stores/template";
import { Box, Button, Center, Flex, Text, useTheme } from "@chakra-ui/react";
import { useTranslations } from "next-intl";

export default function DevboxHeader({ listLength }: { listLength: number }) {
  const { openTemplateModal } = useTemplateStore()
  const theme = useTheme()
  const router = useRouter()
  const t = useTranslations()
  return <Flex h={'90px'} alignItems={'center'}>
    <Center
      mr={'16px'}
      width={'46px'}
      bg={'#FFF'}
      height={'46px'}
      border={theme.borders.base}
      borderRadius={'md'}>
      <MyIcon name="logo" w={'30px'} h={'30px'} />
    </Center>
    <Box fontSize={'xl'} color={'grayModern.900'} fontWeight={'bold'}>
      {t('devbox_list')}
    </Box>
    <Box ml={'8px'} fontSize={'md'} fontWeight={'bold'} color={'grayModern.500'}>
      ( {listLength} )
    </Box>
    <Flex
      alignItems="center"
      justifyContent="center"
      height="18px"
      borderRadius="6px"
      gap="4px"
      mr={'20px'}
      ml={'auto'}
      cursor="pointer"
      onClick={() => {
        openTemplateModal({
          'templateState': TemplateState.publicTemplate
        })
      }}
    >
      <MyIcon
        name={'templateTitle'}
        width="18px"
        height="18px"
        color="#0884DD"
        fill={"#0884DD"}
      />
      <Text
        fontFamily="PingFang SC"
        fontSize="12px"
        fontWeight="500"
        lineHeight="16px"
        letterSpacing="0.5px"
        color="#485264"
      >
        {t("scan_templates")}
      </Text>
    </Flex>
    <Button
      minW={'156px'}
      h={'40px'}
      variant={'solid'}
      leftIcon={<MyIcon name={'plus'} w={'20px'} fill={'#ffffff'} />}
      onClick={() => router.push('/devbox/create')}>
      {t('create_devbox')}
    </Button>
  </Flex>;
}