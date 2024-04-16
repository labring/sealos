import React, { useState } from 'react';
import { Box, Grid, useTheme, Flex } from '@chakra-ui/react';
import YamlCode from '@/components/YamlCode/index';
import styles from './index.module.scss';
import { useCopyData } from '@/utils/tools';
import type { YamlItemType, QueryType } from '@/types';
import { Tabs } from '@sealos/ui';
import { obj2Query } from '@/api/tools';
import { useRouter } from 'next/router';
import MyIcon from '@/components/Icon';
import { useTranslation } from 'next-i18next';

const Yaml = ({ yamlList = [], pxVal }: { yamlList: YamlItemType[]; pxVal: number }) => {
  const theme = useTheme();
  const router = useRouter();
  const { name } = router.query as QueryType;
  const { copyData } = useCopyData();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { t } = useTranslation();

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
            { id: 'form', label: t('Config Form') },
            { id: 'yaml', label: t('YAML File') }
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
        <Flex
          flexDirection={'column'}
          mt={3}
          borderRadius={'md'}
          overflow={'hidden'}
          bg={'white'}
          p="4px"
          border={theme.borders.base}
        >
          {yamlList.map((file, index) => (
            <Flex
              key={file.filename}
              py={'8px'}
              cursor={'pointer'}
              alignItems={'center'}
              h={'40px'}
              borderRadius={'base'}
              _hover={{
                backgroundColor: 'grayModern.100'
              }}
              {...(index === selectedIndex
                ? {
                    fontWeight: 'bold',
                    borderColor: 'myGray.900',
                    backgroundColor: 'grayModern.100'
                  }
                : {
                    color: 'grayModern.900',
                    borderColor: 'myGray.200',
                    backgroundColor: 'transparent'
                  })}
              onClick={() => setSelectedIndex(index)}
            >
              <Box
                w={'2px'}
                h={'24px'}
                justifySelf={'start'}
                bg={'grayModern.900'}
                borderRadius={'12px'}
                opacity={selectedIndex === index ? 1 : 0}
              ></Box>
              <Box ml="18px">{file.filename}</Box>
            </Flex>
          ))}
        </Flex>
      </Box>
      {!!yamlList[selectedIndex] && (
        <Flex
          className={styles.codeBox}
          flexDirection={'column'}
          h={'100%'}
          overflow={'hidden'}
          border={theme.borders.base}
          borderRadius={'lg'}
          position={'relative'}
        >
          <Flex px={8} py={4} bg={'grayModern.50'} alignItems={'center'}>
            <Box flex={1} fontSize={'xl'} color={'grayModern.900'} fontWeight={'bold'}>
              {yamlList[selectedIndex].filename}
            </Box>
            <Box
              cursor={'pointer'}
              _hover={{ color: '#219BF4' }}
              onClick={() => copyData(yamlList[selectedIndex].value)}
            >
              <MyIcon name="copy" w={'16px'} />
            </Box>
          </Flex>
          <Box flex={1} h={0} overflow={'auto'} bg={'#ffffff'} p={4}>
            <YamlCode className={styles.code} content={yamlList[selectedIndex].value} />
          </Box>
        </Flex>
      )}
    </Grid>
  );
};

export default Yaml;
