import { useState } from 'react'
import { Box, Button, Flex } from '@chakra-ui/react'

import MyIcon from './Icon'
import Code from './Code'

const ScriptCode = () => {
  const [onOpenScripts, setOnOpenScripts] = useState(false)

  return (
    <>
      <Flex
        justifyContent={'space-between'}
        bg={'grayModern.25'}
        p={2}
        borderRadius={'6px'}
        border={'1px solid'}
        borderColor={'grayModern.200'}
        alignItems={'center'}>
        <Box>
          <Button
            onClick={() => setOnOpenScripts(!onOpenScripts)}
            bg={'transparent'}
            border={'none'}
            boxShadow={'none'}
            color={'grayModern.900'}
            fontWeight={400}
            leftIcon={<MyIcon name="arrowDown" color={'grayModern.500'} w={'16px'} />}
            _hover={{
              color: 'brightBlue.600',
              '& svg': {
                color: 'brightBlue.600'
              }
            }}>
            Bash
          </Button>
        </Box>
        <Box>
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
            <MyIcon name="copy" color={'grayModern.600'} w={'16px'} />
          </Button>
        </Box>
      </Flex>
      {onOpenScripts && <Code content={'test'} language="bash" />}
    </>
  )
}

export default ScriptCode
