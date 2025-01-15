import { useState } from 'react';
import { Box, Button, Collapse, Flex } from '@chakra-ui/react';

import MyIcon from './Icon';
import Code from './Code';
import { useCopyData } from '@/utils/tools';

const ScriptCode = ({
  platform,
  script,
  defaultOpen = false,
  oneLine = false
}: {
  platform: string;
  script: string;
  defaultOpen?: boolean;
  oneLine?: boolean;
}) => {
  const [onOpenScripts, setOnOpenScripts] = useState(defaultOpen);

  const { copyData } = useCopyData();

  return (
    <Flex
      px={2}
      py={1}
      borderRadius={'6px'}
      border={'1px solid'}
      borderColor={'grayModern.200'}
      flexDirection={oneLine ? 'row' : 'column'}
      w={'585px'}
      maxH={'300px'}
      sx={{
        '& .copy-button': {
          display: 'none'
        },
        '&:hover .copy-button': {
          display: 'flex'
        }
      }}
    >
      <Flex justifyContent={oneLine ? 'null' : 'space-between'} alignItems={'center'} w={'full'}>
        {!oneLine && (
          <Box>
            <Button
              onClick={() => setOnOpenScripts(!onOpenScripts)}
              bg={'transparent'}
              border={'none'}
              boxShadow={'none'}
              color={'grayModern.900'}
              fontWeight={400}
              _hover={{
                cursor: 'pointer'
              }}
              leftIcon={
                <MyIcon
                  name="arrowRight"
                  color={'grayModern.500'}
                  w={'16px'}
                  transform={onOpenScripts ? 'rotate(90deg)' : 'rotate(0)'}
                  transition="transform 0.2s ease"
                />
              }
            >
              {platform === 'Windows' ? 'PowerShell' : 'Bash'}
            </Button>
          </Box>
        )}
        {oneLine && (
          <Box py={2} overflowY={'auto'} h={'100%'} pl={4}>
            <Code content={script} language={platform === 'Windows' ? 'powershell' : 'bash'} />
          </Box>
        )}
        <Button
          className="copy-button"
          bg={'transparent'}
          border={'none'}
          {...(oneLine && {
            position: 'absolute',
            right: 2
          })}
          boxShadow={'none'}
          color={'grayModern.900'}
          _hover={{
            color: 'brightBlue.600',
            '& svg': {
              color: 'brightBlue.600'
            }
          }}
        >
          <MyIcon
            name="copy"
            color={'grayModern.600'}
            w={'16px'}
            onClick={() => copyData(script)}
          />
        </Button>
      </Flex>
      {!oneLine && (
        <Collapse in={onOpenScripts} animateOpacity>
          <Box pt={2} pl={3} overflowY={'auto'} h={'100%'}>
            <Code content={script} language={platform === 'Windows' ? 'powershell' : 'bash'} />
          </Box>
        </Collapse>
      )}
    </Flex>
  );
};

export default ScriptCode;
