import YamlCode from '@/components/YamlCode';
import type { YamlItemType } from '@/types';
import { Box, Flex, Grid } from '@chakra-ui/react';
import { useState } from 'react';

const YamlList = ({ yamlList = [] }: { yamlList: YamlItemType[] }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <Flex
      flexGrow={1}
      // h="0"
      mt={'12px'}
      alignItems={'start'}
      zIndex={1}
      position={'relative'}
      overflow={'scroll'}
    >
      <Box flexShrink={0} mt={3} borderRadius={'sm'} overflow={'hidden'} bg={'white'}>
        {yamlList.map((file, index) => (
          <Box
            key={file.filename}
            px={5}
            py={3}
            cursor={'pointer'}
            borderLeft={'2px solid'}
            alignItems={'center'}
            h={'48px'}
            _hover={{
              backgroundColor: 'myWhite.400'
            }}
            {...(index === selectedIndex
              ? {
                  fontWeight: 'bold',
                  borderColor: 'myGray.900',
                  backgroundColor: 'myWhite.600 !important'
                }
              : {
                  color: 'myGray.500',
                  borderColor: 'myGray.200',
                  backgroundColor: 'transparent'
                })}
            onClick={() => setSelectedIndex(index)}
          >
            {file.filename.replace(/-.*/, '')}
          </Box>
        ))}
      </Box>
      {!!yamlList[selectedIndex] && (
        <Grid w="0" h="full" flex={'auto'} overflow={'auto'}>
          <YamlCode content={yamlList[selectedIndex].value} />
        </Grid>
      )}
    </Flex>
  );
};

export default YamlList;
