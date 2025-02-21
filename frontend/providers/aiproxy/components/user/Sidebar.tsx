'use client'
import { Flex, Text } from '@chakra-ui/react'
import Image, { StaticImageData } from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useTranslationClientSide } from '@/app/i18n/client'
import homeIcon from '@/ui/svg/icons/sidebar/home.svg'
import homeIcon_a from '@/ui/svg/icons/sidebar/home_a.svg'
import logsIcon from '@/ui/svg/icons/sidebar/logs.svg'
import logsIcon_a from '@/ui/svg/icons/sidebar/logs_a.svg'
import priceIcon from '@/ui/svg/icons/sidebar/price.svg'
import priceIcon_a from '@/ui/svg/icons/sidebar/price_a.svg'
import keysIcon from '@/ui/svg/icons/sidebar/key.svg'
import keysIcon_a from '@/ui/svg/icons/sidebar/key_a.svg'
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
      id: 'keys',
      url: '/key',
      value: t('Sidebar.Keys'),
      icon: keysIcon,
      activeIcon: keysIcon_a,
      display: true
    },
    {
      id: 'home',
      url: '/home',
      value: t('Sidebar.Home'),
      icon: homeIcon,
      activeIcon: homeIcon_a,
      display: true
    },
    {
      id: 'logs',
      url: '/log',
      value: t('Sidebar.Logs'),
      icon: logsIcon,
      activeIcon: logsIcon_a,
      display: true
    },
    {
      id: 'price',
      url: '/price',
      value: t('Sidebar.Price'),
      icon: priceIcon,
      activeIcon: priceIcon_a,
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
