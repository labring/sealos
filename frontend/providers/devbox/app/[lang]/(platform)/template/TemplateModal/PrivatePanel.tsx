import { listPrivateTemplateRepository } from '@/api/template';
import MyIcon from '@/components/Icon';
import SwitchPage from '@/components/SwitchPage';
import { Box, Flex, Grid, TabPanel, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import TemplateCard from './TemplateCard';

export default function PrivatePanel({ search }: { search: string }) {
  const [pageQueryBody, setPageQueryBody] = useState({
    page: 1,
    pageSize: 30,
    totalItems: 0,
    totalPage: 0
  });

  // reset query
  useEffect(() => {
    if (!search) return;
    setPageQueryBody((prev) => ({
      ...prev,
      page: 1,
      totalItems: 0,
      totalPage: 0
    }));
  }, [search]);
  // reset query
  const queryBody = {
    page: pageQueryBody.page,
    pageSize: pageQueryBody.pageSize,
    search
  };
  const listPrivateTemplateReposistory = useQuery(
    ['template-repository-list', 'template-repository-private', queryBody],
    () => {
      return listPrivateTemplateRepository(queryBody);
    }
  );

  useEffect(() => {
    if (
      listPrivateTemplateReposistory.isFetched &&
      listPrivateTemplateReposistory.isSuccess &&
      listPrivateTemplateReposistory.data
    ) {
      const data = listPrivateTemplateReposistory.data.page;
      setPageQueryBody((prev) => ({
        ...prev,
        totalItems: data.totalItems || 0,
        totalPage: data.totalPage || 0,
        page: data.page || 1
      }));
    }
  }, [
    listPrivateTemplateReposistory.data,
    listPrivateTemplateReposistory.isFetched,
    listPrivateTemplateReposistory.isSuccess
  ]);

  const t = useTranslations();
  const privateTempalteReposistoryList =
    listPrivateTemplateReposistory.data?.templateRepositoryList || [];
  return (
    <TabPanel p={0} height={'full'}>
      <Flex flex="1" direction={'column'} h={'full'}>
        <Text color={'grayModern.600'} mb="16px" fontSize="18px" fontWeight={500}>
          {t('my_templates')}
        </Text>
        <Box h={'0'} flex={1} overflow={'auto'} position={'relative'}>
          <Grid
            templateColumns="repeat(auto-fill, minmax(clamp(210px, 300px, 438px), 1fr));"
            gap="20px"
            position={'absolute'}
            inset={0}
            gridAutoRows={'max-content'}
          >
            {privateTempalteReposistoryList.map((tr) => (
              <TemplateCard
                key={tr.uid}
                isPublic={tr.isPublic}
                isDisabled={tr.templates.length === 0}
                iconId={tr.iconId || ''}
                templateRepositoryName={tr.name}
                templateRepositoryDescription={tr.description}
                templateRepositoryUid={tr.uid}
                inPublicStore={false}
                tags={tr.templateRepositoryTags.map((t) => t.tag)}
              />
            ))}
          </Grid>
          {privateTempalteReposistoryList.length === 0 && (
            <Flex
              justifyContent={'center'}
              flex={1}
              alignItems={'center'}
              flexDirection={'column'}
              gap={4}
              h="full"
            >
              <MyIcon name="empty" w={'40px'} h={'40px'} color={'white'} />
              <Box textAlign={'center'} color={'grayModern.600'}>
                {t('no_template_repository_versions')}
              </Box>
            </Flex>
          )}
        </Box>
        <Flex>
          <SwitchPage
            ml={'auto'}
            mr={'0'}
            pageSize={pageQueryBody.page}
            totalPage={pageQueryBody.totalPage}
            totalItem={pageQueryBody.totalItems}
            currentPage={pageQueryBody.page}
            setCurrentPage={(currentPage) => {
              setPageQueryBody((page) => {
                return {
                  ...page,
                  page: currentPage
                };
              });
            }}
          />
        </Flex>
      </Flex>
    </TabPanel>
  );
}
