import { listTag, listTemplateRepository } from '@/api/template';
import SwitchPage from '@/components/SwitchPage';
import { Tag, TagType } from '@/prisma/generated/client';
import { createTagSelectorStore } from '@/stores/tagSelector';
import { getLangStore } from '@/utils/cookie';
import { Box, Divider, Flex, FlexProps, Grid, Heading, TabPanel, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { createContext, useContext, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { TagCheckbox } from '../TagCheckbox';
import TemplateCard from './TemplateCard';
const TagSelectorStoreCtx = createContext<ReturnType<typeof createTagSelectorStore> | null>(null);
const TagItem = ({ tag, ...props }: { tag: Tag } & FlexProps) => {
  const store = useContext(TagSelectorStoreCtx);
  if (!store) throw new Error('TagSelectorStoreCtx is null');
  const { selectedTagList, setSelectedTag } = useStore(store);
  const lastLang = getLangStore();
  return !tag ? null : (
    <Flex align="center" gap="8px" h={'36px'} {...props}>
      <TagCheckbox
        ml={tag.type !== TagType.OFFICIAL_CONTENT ? '10px' : '0'}
        defaultChecked={tag.type === TagType.OFFICIAL_CONTENT}
        isChecked={selectedTagList.has(tag.uid)}
        onChange={(e) => {
          const selected = e.target.checked;
          setSelectedTag(tag.uid, selected);
        }}
      ></TagCheckbox>
      <Text fontWeight={500} fontSize={'14px'} color={'grayModern.600'}>
        {tag[lastLang === 'zh' ? 'zhName' : 'enName'] || tag.name}
      </Text>
    </Flex>
  );
};
const TagList = ({ tags, title }: { tags: Tag[]; title: string }) => {
  const t = useTranslations();
  return (
    <Box>
      <Text color={'grayModern.600'} mb={'12px'} fontWeight={'500'}>
        {title}
      </Text>
      <Flex direction="column" gap="4px">
        {tags.map((tag, index) => (
          <TagItem borderRadius={'6px'} key={tag.uid} tag={tag} bgColor={'grayModern.25'}></TagItem>
        ))}
      </Flex>
    </Box>
  );
};
const PublicPanel = ({ search }: { search: string }) => {
  const [tagSelectorStore] = useState(createTagSelectorStore());
  return (
    <TagSelectorStoreCtx.Provider value={tagSelectorStore}>
      <_PublicPanel search={search} />
    </TagSelectorStoreCtx.Provider>
  );
};
function _PublicPanel({ search }: { search: string }) {
  const tagsQuery = useQuery(['template-repository-tags'], listTag, {
    staleTime: Infinity,
    cacheTime: Infinity
  });
  let tags = (tagsQuery.data?.tagList || []).sort((a, b) =>
    a.name === 'official' ? -1 : b.name === 'official' ? 1 : 0
  );
  let tagListCollection = tags.reduce(
    (acc, tag) => {
      if (!acc[tag.type]) {
        acc[tag.type] = [];
      }
      acc[tag.type].push(tag);
      return acc;
    },
    {
      [TagType.OFFICIAL_CONTENT]: [],
      [TagType.USE_CASE]: [],
      [TagType.PROGRAMMING_LANGUAGE]: []
    } as Record<TagType, Tag[]>
  );
  const store = useContext(TagSelectorStoreCtx);
  if (!store) throw new Error('TagSelectorStoreCtx is null');
  const state = useStore(store);

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
  useEffect(() => {
    setPageQueryBody((prev) => ({
      ...prev,
      page: 1,
      totalItems: 0,
      totalPage: 0
    }));
  }, [state.selectedTagList]);
  const queryBody = {
    page: pageQueryBody.page,
    pageSize: pageQueryBody.pageSize,
    search,
    tags: state.getSelectedTagList()
  };
  const listTemplateReposistory = useQuery(
    ['template-repository-list', 'template-repository-public', queryBody],
    () => {
      return listTemplateRepository(
        {
          page: queryBody.page,
          pageSize: queryBody.pageSize
        },
        queryBody.tags,
        queryBody.search
      );
    }
  );

  useEffect(() => {
    if (listTemplateReposistory.isSuccess && listTemplateReposistory.data) {
      const data = listTemplateReposistory.data.page;
      setPageQueryBody((prev) => ({
        ...prev,
        totalItems: data.totalItems || 0,
        totalPage: data.totalPage || 0,
        page: data.page || 1
      }));
    }
  }, [listTemplateReposistory.data]); // 添加依赖项

  const tempalteReposistoryList = listTemplateReposistory.data?.templateRepositoryList || [];
  const t = useTranslations();
  return (
    <TabPanel p={0} height={'full'}>
      <Flex gap="8px" height={'full'}>
        {/* Left Sidebar */}
        <Flex w="150px" direction={'column'} height={'full'}>
          <Heading fontSize={'16px'} fontWeight={500} color={'grayModern.900'} mb="2">
            {t('tags')}
          </Heading>
          <Flex direction={'column'} flex={1} position={'relative'}>
            <Flex
              direction={'column'}
              position={'absolute'}
              inset={0}
              overflow={'auto'}
              pr={'4px'}
              sx={{
                '&::-webkit-scrollbar': {
                  width: '6px'
                },
                scrollbarWidth: '6px'
              }}
            >
              <Flex direction="column" gap="2px">
                {/* <TagList tags={tagListCollection[TagType.OFFICIAL_CONTENT]} /> */}
                <TagItem tag={tagListCollection[TagType.OFFICIAL_CONTENT][0]} />
                <Divider color={'grayModern.150'} mt={'11px'} mb="12px"></Divider>
                <TagList tags={tagListCollection[TagType.USE_CASE]} title={t('use_case')} />
                <Divider color={'grayModern.150'} my={'12px'}></Divider>
                <TagList
                  tags={tagListCollection[TagType.PROGRAMMING_LANGUAGE]}
                  title={t('programming_language')}
                />
              </Flex>
            </Flex>
          </Flex>
        </Flex>

        {/* Right Content */}
        <Flex flex="1" flexDir={'column'}>
          <Text color={'grayModern.600'} mb="16px" fontSize="18px" fontWeight={500}>
            {t('all_templates')}
          </Text>
          <Box
            width={'full'}
            flex={1}
            h={'400px'}
            overflow={'auto'}
            position={'relative'}
            pr={'4px'}
            sx={{
              '&::-webkit-scrollbar': {
                width: '6px'
              },
              scrollbarWidth: '6px'
            }}
          >
            <Grid
              templateColumns="repeat(auto-fill, minmax(clamp(210px, 300px, 440px), 1fr));"
              inset={0}
              gap="20px"
              position={'absolute'}
              gridAutoRows={'max-content'}
            >
              {tempalteReposistoryList.map((tr) => {
                return (
                  <TemplateCard
                    key={tr.uid}
                    iconId={tr.iconId || ''}
                    templateRepositoryName={tr.name}
                    templateRepositoryDescription={tr.description}
                    templateRepositoryUid={tr.uid}
                    tags={tr.templateRepositoryTags.map((t) => t.tag)}
                    isPublic
                  />
                );
              })}
            </Grid>
          </Box>
          <Flex>
            <SwitchPage
              ml={'auto'}
              mr={'0'}
              mt={'8px'}
              pageSize={pageQueryBody.pageSize}
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
      </Flex>
    </TabPanel>
  );
}
export default PublicPanel;
