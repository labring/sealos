import MyIcon from '@/components/Icon';
import YamlCode from '@/components/YamlCode/index';
import type { QueryType, YamlItemType } from '@/types';
import { useCopyData } from '@/utils/tools';
import { Box, Flex, useTheme } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useState } from 'react';
import styles from './index.module.scss';

const YamlList = ({ yamlList = [] }: { yamlList: YamlItemType[] }) => {
  const theme = useTheme();
  const router = useRouter();
  const { name } = router.query as QueryType;
  const { copyData } = useCopyData();
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <Flex
      flexGrow={1}
      mt={'12px'}
      alignItems={'start'}
      zIndex={1}
      position={'relative'}
      overflow={'hidden'}
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
            {file.filename}
          </Box>
        ))}
      </Box>
      {!!yamlList[selectedIndex] && (
        <Flex
          w="100%"
          h="100%"
          className={styles.codeBox}
          flexDirection={'column'}
          position={'relative'}
        >
          {/* <Flex px={8} py={4} bg={'myWhite.400'}>
            <Box flex={1} fontSize={'xl'} color={'myGray.900'} fontWeight={'bold'}>
              {yamlList[selectedIndex].filename}
            </Box>
            <Box
              cursor={'pointer'}
              color={'myGray.600'}
              _hover={{ color: '#219BF4' }}
              onClick={() => copyData(yamlList[selectedIndex].value)}>
              <MyIcon name="copy" w={'16px'} />
            </Box>
          </Flex> */}
          <Box flex={1} h={0} bg={'#ffffff'} p={4}>
            <YamlCode className={styles.code} content={yamlList[selectedIndex].value} />
          </Box>
        </Flex>
      )}
    </Flex>
  );
};

export default YamlList;
