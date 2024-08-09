import { useRouter } from 'next/navigation'
import { MyTable, SealosMenu } from '@sealos/ui'
import { Box, Button, Center, Flex, Image, MenuButton, useTheme } from '@chakra-ui/react'

import MyIcon from '@/components/Icon'
import { printMemory } from '@/utils/tools'
import { DevboxListItemType } from '@/types/devbox'
import DevboxStatusTag from '@/components/DevboxStatusTag'

const DevboxList = ({
  devboxList = []
}: {
  devboxList: DevboxListItemType[]
  refetchApps: () => void
}) => {
  const theme = useTheme()
  const router = useRouter()

  const columns: {
    title: string
    dataIndex?: keyof DevboxListItemType
    key: string
    render?: (item: DevboxListItemType) => JSX.Element
  }[] = [
    {
      title: '名字',
      key: 'name',
      render: (item: DevboxListItemType) => {
        return (
          <Flex alignItems={'center'} gap={'6px'}>
            <Image
              width={'20px'}
              height={'20px'}
              alt={item.id}
              src={`/images/${item.runtime}.svg`}
            />
            {/* TODO：先看看渲染效果，再看看是否更改 */}
            <Box color={'grayModern.900'} fontSize={'md'}>
              {item.name}
            </Box>
            {/*  NOTE: 这里为啥db-provider要使用枚举 */}
          </Flex>
        )
      }
    },
    {
      title: '状态',
      key: 'status',
      render: (item: DevboxListItemType) => <DevboxStatusTag status={item.status} />
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime'
    },
    {
      title: 'CPU',
      key: 'cpu',
      render: (item: DevboxListItemType) => <>{item.cpu / 1000}C</>
    },
    {
      title: '内存',
      key: 'memory',
      render: (item: DevboxListItemType) => <>{printMemory(item.memory)}</>
    },
    // NOTE: 这里可能需要加一个网络配置
    {
      title: '操作',
      key: 'control',
      render: (item: DevboxListItemType) => (
        <Flex>
          <Button
            mr={5}
            height={'32px'}
            size={'sm'}
            fontSize={'base'}
            bg={'grayModern.150'}
            color={'grayModern.900'}
            _hover={{
              color: 'brightBlue.600'
            }}
            leftIcon={<MyIcon name={'detail'} w={'16px'} />}
            // TODO: 这里要加上跳转vscode逻辑
            onClick={() => {}}>
            {'VS Code 插件'}
          </Button>
          <SealosMenu
            width={100}
            Button={
              <MenuButton as={Button} variant={'square'} w={'30px'} h={'30px'}>
                <MyIcon name={'more'} />
              </MenuButton>
            }
            menuList={[
              {
                child: (
                  <>
                    <MyIcon name={'codeServer'} w={'16px'} />
                    <Box ml={2}>{'CodeServer'}</Box>
                  </>
                ),
                onClick: () => {} // TODO： 添加跳转code server逻辑
              },
              {
                child: (
                  <>
                    <MyIcon name={'version'} w={'16px'} />
                    <Box ml={2}>{'版本'}</Box>
                  </>
                ),
                onClick: () => {} // TODO: 添加跳转版本逻辑
              },
              {
                child: (
                  <>
                    <MyIcon name={'terminal'} w={'16px'} />
                    <Box ml={2}>{'终端'}</Box>
                  </>
                ),
                onClick: () => {} // TODO: 添加跳转终端逻辑
              }
            ]}
          />
        </Flex>
      )
    }
  ]

  return (
    <Box backgroundColor={'grayModern.100'} px={'32px'} minH="100vh">
      <Flex h={'90px'} alignItems={'center'}>
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
          {'项目列表'}
        </Box>
        <Box ml={'8px'} fontSize={'md'} fontWeight={'bold'} color={'grayModern.500'}>
          ( {devboxList.length} )
        </Box>
        <Box flex={1}></Box>
        <Button
          minW={'156px'}
          h={'40px'}
          variant={'solid'}
          leftIcon={<MyIcon name={'plus'} w={'20px'} />}
          onClick={() => router.push('/db/create')}>
          {'新建项目'}
        </Button>
      </Flex>
      <MyTable columns={columns} data={devboxList} />
    </Box>
  )
}

export default DevboxList
