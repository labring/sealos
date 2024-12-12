import { useState } from 'react'
import { Box, Button, Flex } from '@chakra-ui/react'

import MyIcon from './Icon'
import Code from './Code'

const ScriptCode = ({ platform, script }: { platform: string; script: string }) => {
  const [onOpenScripts, setOnOpenScripts] = useState(false)

  return (
    <>
      <Flex
        bg={'grayModern.25'}
        p={2}
        borderRadius={'6px'}
        border={'1px solid'}
        borderColor={'grayModern.200'}
        flexDirection={'column'}>
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
                onOpenScripts ? (
                  <MyIcon name="arrowUp" color={'grayModern.500'} w={'16px'} />
                ) : (
                  <MyIcon name="arrowDown" color={'grayModern.500'} w={'16px'} />
                )
              }
              _hover={{
                color: 'brightBlue.600',
                '& svg': {
                  color: 'brightBlue.600'
                }
              }}>
              {platform === 'windows' ? 'PowerShell' : 'Bash'}
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
            <MyIcon name="copy" color={'grayModern.600'} w={'16px'} />
          </Button>
        </Flex>
        {onOpenScripts && (
          <Box pt={2} pl={3}>
            <Code content={script} language={platform === 'windows' ? 'powershell' : 'bash'} />
          </Box>
        )}
      </Flex>
    </>
  )
}

export default ScriptCode
