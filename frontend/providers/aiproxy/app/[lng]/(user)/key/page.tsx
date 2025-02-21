'use client'

import { Button, Flex, Link, Text } from '@chakra-ui/react'

import KeyList from '@/components/user/KeyList'
import { useBackendStore } from '@/store/backend'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { useSessionStore } from '@/store/session'
import { MyTooltip } from '@/components/common/MyTooltip'
export default function Key(): JSX.Element {
  const { isInvitationActive } = useBackendStore()
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { session } = useSessionStore.getState()
  const { invitationUrl } = useBackendStore()
  let userInvitationUrl = ''
  if (isInvitationActive && invitationUrl) {
    const userId = session?.user.id
    const baseUrl = new URL(invitationUrl).origin
    userInvitationUrl = `${baseUrl}/?uid=${userId}`
  }

  return (
    <Flex pt="4px" pb="12px" pr="12px" gap="8px" h="full" w="full">
      {isInvitationActive ? (
        <Flex
          flexGrow="1"
          p="12px 32px 8px 32px"
          flexDirection="column"
          alignItems="flex-start"
          gap="24px"
          bg="white"
          h="full"
          w="full"
          minW="500px"
          borderRadius="12px">
          <Flex
            p="6px 12px"
            justifyContent="center"
            alignItems="center"
            alignSelf="stretch"
            borderRadius="6px"
            bgGradient="linear(90deg, #F0F4FF 4%, #FAF1FF 54%, #F0F4FF 100%)">
            <Flex gap="20px">
              <Flex gap="6px" alignItems="center">
                <Flex>
                  <Text
                    color="grayModern.900"
                    fontFamily="PingFang SC"
                    fontSize="14px"
                    fontStyle="normal"
                    fontWeight={500}
                    lineHeight="20px"
                    letterSpacing="0.1px">
                    🎉{t('keyList.invitationText1')}
                  </Text>
                </Flex>
                <Flex>
                  <Text
                    color="grayModern.900"
                    fontFamily="PingFang SC"
                    fontSize="14px"
                    fontStyle="normal"
                    fontWeight={400}
                    lineHeight="20px"
                    letterSpacing="0.25px">
                    {t('keyList.invitationText2')}
                  </Text>
                  <Text
                    sx={{
                      background:
                        'linear-gradient(90deg, #004CFF 0.92%, #FF53D4 40.73%, #004CFF 91.52%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                    fontFamily="PingFang SC"
                    fontSize="14px"
                    fontStyle="normal"
                    fontWeight={500}
                    lineHeight="20px"
                    letterSpacing="0.1px">
                    {t('keyList.invitationText3')}
                  </Text>
                </Flex>
                <Flex>
                  <Text
                    color="grayModern.900"
                    fontFamily="PingFang SC"
                    fontSize="14px"
                    fontStyle="normal"
                    fontWeight={500}
                    lineHeight="20px"
                    letterSpacing="0.1px">
                    {t('keyList.invitationText4')}
                  </Text>
                  <MyTooltip width="auto" height="auto" label={t('keyList.invitationText5')}>
                    <Text
                      color="#487FFF"
                      fontFamily="PingFang SC"
                      fontSize="14px"
                      fontStyle="normal"
                      fontWeight={500}
                      lineHeight="20px"
                      letterSpacing="0.1px"
                      textDecoration="underline"
                      textDecorationStyle="solid"
                      textUnderlineOffset="auto"
                      cursor="pointer"
                      onClick={() => {
                        navigator.clipboard.writeText(userInvitationUrl)
                      }}>
                      {userInvitationUrl}
                    </Text>
                  </MyTooltip>
                </Flex>
              </Flex>

              <Button
                variant="unstyled"
                display="flex"
                w="92px"
                h="28px"
                minW="92px"
                minH="28px"
                padding="6px 12px"
                justifyContent="center"
                alignItems="center"
                gap="4px"
                borderRadius="52px"
                bgGradient="linear(90deg, #1058FF 0%, #838AF1 57.5%, #FF80E6 100%)"
                color="white"
                onClick={() => {
                  window.open(invitationUrl, '_blank')
                }}>
                <Text
                  color="white"
                  fontFamily="PingFang SC"
                  fontSize="12px"
                  fontWeight={500}
                  lineHeight="16px"
                  letterSpacing="0.5px">
                  {t('keyList.invite')}
                </Text>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="14"
                  viewBox="0 0 15 14"
                  fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M8.25419 3.08752C8.02638 3.31533 8.02638 3.68467 8.25419 3.91248L10.7584 6.41667H2.83333C2.51117 6.41667 2.25 6.67783 2.25 7C2.25 7.32217 2.51117 7.58333 2.83333 7.58333H10.7584L8.25419 10.0875C8.02638 10.3153 8.02638 10.6847 8.25419 10.9125C8.48199 11.1403 8.85134 11.1403 9.07915 10.9125L12.5791 7.41248C12.807 7.18467 12.807 6.81533 12.5791 6.58752L9.07915 3.08752C8.85134 2.85972 8.48199 2.85972 8.25419 3.08752Z"
                    fill="white"
                  />
                </svg>
              </Button>
            </Flex>
          </Flex>

          <Flex flexDirection="column" alignItems="flex-start" gap="16px" w="full" h="full">
            <KeyList />
          </Flex>
        </Flex>
      ) : (
        <Flex
          flexGrow="1"
          p="24px 32px 8px 32px"
          flexDirection="column"
          alignItems="flex-start"
          gap="13px"
          bg="white"
          h="full"
          w="full"
          minW="500px"
          borderRadius="12px">
          <KeyList />
        </Flex>
      )}
    </Flex>
  )
}
