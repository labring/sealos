'use client'
import { Flex } from '@chakra-ui/react'

export default function DashboardPage() {
  return (
    <>
      <Flex gap="13px" marginBottom="12px">
        Dashboard
      </Flex>
      <ChannelList />
    </>
  )
}

function ChannelList() {
  return <Flex>ChannelList</Flex>
}
