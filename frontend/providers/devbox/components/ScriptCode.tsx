import { useState } from 'react'
import { Box, Button, Collapse, Flex } from '@chakra-ui/react'

import MyIcon from './Icon'
import Code from './Code'
import { useCopyData } from '@/utils/tools'

const ScriptCode = ({
  platform,
  script,
  defaultOpen = false
}: {
  platform: string
  script: string
  defaultOpen?: boolean
}) => {
  const [onOpenScripts, setOnOpenScripts] = useState(defaultOpen)

  const { copyData } = useCopyData()

  return (
    <Flex
      bg={'grayModern.25'}
      p={2}
      borderRadius={'6px'}
      border={'1px solid'}
      borderColor={'grayModern.200'}
      flexDirection={'column'}
      w={'585px'}
      maxH={'400px'}>
      <Flex justifyContent={'space-between'} alignItems={'center'} w={'full'}>
        <Box>
          <Button
            onClick={() => setOnOpenScripts(!onOpenScripts)}
            bg={'transparent'}
            border={'none'}
            boxShadow={'none'}
            color={'grayModern.900'}
            fontWeight={400}
            leftIcon={
              <MyIcon
                name="arrowRight"
                color={'grayModern.500'}
                w={'16px'}
                transform={onOpenScripts ? 'rotate(90deg)' : 'rotate(0)'}
                transition="transform 0.2s ease"
              />
            }
            _hover={{
              color: 'brightBlue.600',
              '& svg': {
                color: 'brightBlue.600'
              }
            }}>
            {platform === 'Windows' ? 'PowerShell' : 'Bash'}
          </Button>
        </Box>
        <Button
          bg={'transparent'}
          border={'none'}
          boxShadow={'none'}
          color={'grayModern.900'}
          _hover={{
            color: 'brightBlue.600',
            '& svg': {
              color: 'brightBlue.600'
            }
          }}>
          <MyIcon
            name="copy"
            color={'grayModern.600'}
            w={'16px'}
            onClick={() => copyData(script)}
          />
        </Button>
      </Flex>
      <Collapse in={onOpenScripts} animateOpacity>
        <Box pt={2} pl={3} overflowY={'auto'} h={'100%'}>
          <Code content={script} language={platform === 'Windows' ? 'powershell' : 'bash'} />
        </Box>
      </Collapse>
    </Flex>
  )
}

export default ScriptCode
