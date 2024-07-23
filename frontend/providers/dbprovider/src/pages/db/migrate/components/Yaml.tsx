import MyIcon from '@/components/Icon';
import YamlCode from '@/components/YamlCode/index';
import type { QueryType, YamlItemType } from '@/types';
import { useCopyData } from '@/utils/tools';
import { Box, Center, Flex, Grid, useTheme } from '@chakra-ui/react';
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
            { id: 'form', label: t('config_form') },
            { id: 'yaml', label: t('yaml_file') }
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
          borderRadius={'md'}
          position={'relative'}
        >
          <Flex px={8} py={4} bg={'myWhite.400'}>
            <Box flex={1} fontSize={'xl'} color={'grayModern.900'} fontWeight={'bold'}>
              {yamlList[selectedIndex].filename}
            </Box>
            <Center
              cursor={'pointer'}
              color={'grayModern.600'}
              _hover={{ color: '#219BF4' }}
              onClick={() => copyData(yamlList[selectedIndex].value)}
            >
              <MyIcon name="copy" w={'16px'} />
            </Center>
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
