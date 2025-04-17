import { useState } from 'react';
import { Tabs } from '@sealos/ui';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Box, Center, Flex, Grid, useTheme } from '@chakra-ui/react';

import Code from '@/components/Code';
import MyIcon from '@/components/Icon';

import { useRouter } from '@/i18n';
import { obj2Query } from '@/utils/tools';
import type { YamlItemType } from '@/types';
import { useCopyData } from '@/utils/tools';

import styles from './index.module.scss';

const Yaml = ({ yamlList = [], pxVal }: { yamlList: YamlItemType[]; pxVal: number }) => {
  const theme = useTheme();
  const router = useRouter();
  const t = useTranslations();
  const { copyData } = useCopyData();
  const searchParams = useSearchParams();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const devboxName = searchParams.get('name') as string;

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
            router.replace(
              `/devbox/create?${obj2Query({
                type: 'form',
                name: devboxName
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
                    borderColor: 'grayModern.900',
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
          <Flex px={8} py={4} bg={'grayModern.50'}>
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
            <Code className={styles.code} content={yamlList[selectedIndex].value} language="yaml" />
          </Box>
        </Flex>
      )}
    </Grid>
  );
};

export default Yaml;
