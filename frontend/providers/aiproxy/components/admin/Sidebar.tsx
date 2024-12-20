'use client'
import { Flex, Text } from '@chakra-ui/react'
import Image, { StaticImageData } from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useTranslationClientSide } from '@/app/i18n/client'
import homeIcon from '@/ui/svg/icons/admin-sidebar/home.svg'
import homeIcon_a from '@/ui/svg/icons/admin-sidebar/home_a.svg'
import logsIcon from '@/ui/svg/icons/admin-sidebar/logs.svg'
import logsIcon_a from '@/ui/svg/icons/admin-sidebar/logs_a.svg'
import configIcon from '@/ui/svg/icons/admin-sidebar/config.svg'
import configIcon_a from '@/ui/svg/icons/admin-sidebar/config_a.svg'
import nsManagerIcon from '@/ui/svg/icons/admin-sidebar/nsManager.svg'
import nsManagerIcon_a from '@/ui/svg/icons/admin-sidebar/nsManager_a.svg'
import { useI18n } from '@/providers/i18n/i18nContext'

type Menu = {
  id: string
  url: string
  value: string
  icon: StaticImageData
  activeIcon: StaticImageData
  display: boolean
}

const SideBar = (): JSX.Element => {
  const pathname = usePathname()
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')

  const menus: Menu[] = [
    {
      id: 'dashboard',
      url: '/dashboard',
      value: t('Sidebar.Dashboard'),
      icon: homeIcon,
      activeIcon: homeIcon_a,
      display: true
    },
    {
      id: 'global-logs',
      url: '/global-logs',
      value: t('Sidebar.GlobalLogs'),
      icon: logsIcon,
      activeIcon: logsIcon_a,
      display: true
    },
    {
      id: 'global-configs',
      url: '/global-configs',
      value: t('Sidebar.GlobalConfigs'),
      icon: configIcon,
      activeIcon: configIcon_a,
      display: true
    },
    {
      id: 'ns-manager',
      url: '/ns-manager',
      value: t('Sidebar.NsManager'),
      icon: nsManagerIcon,
      activeIcon: nsManagerIcon_a,
      display: true
    }
  ]

  return (
    <Flex
      flexDirection="column"
      py="16px"
      px="12px"
      gap="var(--md, 8px)"
      alignContent="center"
      flex="1">
      {menus
        .filter((menu) => menu.display)
        .map((menu) => {
          const fullUrl = `/${lng}${menu.url}`
          const isActive = pathname === fullUrl

          return (
            <Link href={fullUrl} key={menu.id} style={{ textDecoration: 'none' }}>
              <Flex
                display="flex"
                w="64px"
                px="var(--md, 8px)"
                py="12px"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                gap="var(--xs, 4px)"
                borderRadius="8px"
                cursor="pointer"
                role="group"
                _hover={{ backgroundColor: '#9699B426' }}>
                <Image
                  src={isActive ? menu.activeIcon : menu.icon}
                  alt={menu.value}
                  width={24}
                  height={24}
                />
                <Text
                  color={isActive ? 'grayModern.900' : 'grayModern.500'}
                  fontFamily="PingFang SC"
                  fontSize="11px"
                  fontWeight={500}
                  lineHeight="16px"
                  letterSpacing="0.5px"
                  textAlign="center"
                  whiteSpace="nowrap">
                  {menu.value}
                </Text>
              </Flex>
            </Link>
          )
        })}
    </Flex>
  )
}

export default SideBar
