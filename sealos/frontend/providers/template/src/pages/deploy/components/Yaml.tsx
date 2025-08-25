import MyIcon from '@/components/Icon';
import type { QueryType, YamlItemType } from '@/types';
import { useCopyData } from '@/utils/tools';
import { Box, Flex, useTheme } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useState } from 'react';
import styles from './index.module.scss';
import YamlCode from '@/components/YamlCode';

const Yaml = ({ yamlList = [] }: { yamlList: YamlItemType[]; pxVal: number }) => {
  const theme = useTheme();
  const router = useRouter();
  const { name } = router.query as QueryType;
  const { copyData } = useCopyData();
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <Flex mt={'12px'} w={'100%'} h={'100%'} gridGap={5} alignItems={'start'} zIndex={1}>
      {!!yamlList[selectedIndex] && (
        <Flex
          grow={1}
          className={styles.codeBox}
          flexDirection={'column'}
          h={'100%'}
          overflow={'hidden'}
          border={theme.borders.base}
          borderRadius={'md'}
          position={'relative'}
        >
          <Flex px={8} py={4} bg={'myWhite.400'}>
            <Box flex={1} fontSize={'xl'} color={'myGray.900'} fontWeight={'bold'}>
              {yamlList[selectedIndex].filename}
            </Box>
            <Box
              cursor={'pointer'}
              color={'myGray.600'}
              _hover={{ color: '#219BF4' }}
              onClick={() => copyData(yamlList[selectedIndex].value)}
            >
              <MyIcon name="copy" w={'16px'} />
            </Box>
          </Flex>
          <Box flex={1} h={0} overflow={'auto'} bg={'#ffffff'} p={4}>
            <YamlCode content={yamlList[selectedIndex].value} />
          </Box>
        </Flex>
      )}
    </Flex>
  );
};

export default Yaml;
