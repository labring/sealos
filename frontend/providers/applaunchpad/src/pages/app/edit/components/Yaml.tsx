import React, { useState } from 'react';
import { Box, Grid, useTheme, Flex } from '@chakra-ui/react';
import YamlCode from '@/components/YamlCode/index';
import styles from './index.module.scss';
import { useCopyData } from '@/utils/tools';
import type { YamlItemType, QueryType } from '@/types';
import Tabs from '@/components/Tabs';
import { obj2Query } from '@/api/tools';
import { useRouter } from 'next/router';
import MyIcon from '@/components/Icon';

const Yaml = ({ yamlList = [], pxVal }: { yamlList: YamlItemType[]; pxVal: number }) => {
  const theme = useTheme();
  const router = useRouter();
  const { name } = router.query as QueryType;
  const { copyData } = useCopyData();
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <Grid
      h={'100%'}
      templateColumns={'220px 1fr'}
      gridGap={5}
      alignItems={'start'}
      px={`${pxVal}px`}
    >
      <Box>
        <Tabs
          list={[
            { id: 'form', label: '配置表单' },
            { id: 'yaml', label: 'YAML 文件' }
          ]}
          activeId={'yaml'}
          onChange={() =>
            router.replace(
              `/app/edit?${obj2Query({
                name,
                type: 'form'
              })}`
            )
          }
        />
        <Box mt={3} borderRadius={'sm'} overflow={'hidden'} bg={'white'}>
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
      </Box>
      {!!yamlList[selectedIndex] && (
        <Flex
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
          <Box flex={1} h={0} overflowY={'auto'} bg={'#ffffff'} p={4}>
            <YamlCode className={styles.code} content={yamlList[selectedIndex].value} />
          </Box>
        </Flex>
      )}
    </Grid>
  );
};

export default Yaml;
