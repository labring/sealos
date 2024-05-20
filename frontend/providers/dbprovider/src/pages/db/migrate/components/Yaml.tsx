import MyIcon from '@/components/Icon';
import YamlCode from '@/components/YamlCode/index';
import type { QueryType, YamlItemType } from '@/types';
import { useCopyData } from '@/utils/tools';
import { Box, Flex, Grid, useTheme } from '@chakra-ui/react';
import { Tabs } from '@sealos/ui';
import { useRouter } from 'next/router';
import { useState } from 'react';
import styles from './index.module.scss';
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
            router.push({
              query: {
                ...router.query,
                type: 'form'
              }
            })
          }
        />
        <Box mt={3} borderRadius={'sm'} overflow={'hidden'} bg={'white'}>
          {yamlList.map((file, index) => (
            <Box
              key={file.filename}
              px={5}
              py={3}
              borderLeft={'2px solid'}
              alignItems={'center'}
              h={'48px'}
              {...(yamlList.length > 1
                ? {
                    cursor: 'pointer',
                    _hover: {
                      backgroundColor: 'myWhite.400'
                    },
                    ...(index === selectedIndex
                      ? {
                          fontWeight: 'bold',
                          borderColor: 'grayModern.900',
                          backgroundColor: 'myWhite.600 !important'
                        }
                      : {
                          color: 'grayModern.600',
                          borderColor: 'myGray.200',
                          backgroundColor: 'transparent'
                        })
                  }
                : {})}
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
            <Box flex={1} fontSize={'xl'} color={'grayModern.900'} fontWeight={'bold'}>
              {yamlList[selectedIndex].filename}
            </Box>
            <Box
              cursor={'pointer'}
              color={'grayModern.600'}
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
