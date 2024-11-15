import { listTag, listTemplateRepository } from "@/api/template";
import SwitchPage from "@/components/SwitchPage";
import { useRouter } from "@/i18n";
import { getLangStore } from "@/utils/cookie";
import { Box, Flex, Grid, Heading, TabPanel, Text } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { produce } from "immer";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { TagCheckbox } from "../TagCheckbox";
import TemplateCard from "./TemplateCard";

export default function PublicPanel({
  search, }: {
    search: string,
  }) {
  const tagsQuery = useQuery(
    ['template-repository-tags'],
    listTag,
    {
      staleTime: Infinity,
      cacheTime: Infinity,
    }
  )
  const t = useTranslations()
  const router = useRouter()
  const lastLang = getLangStore()
  const tags = tagsQuery.data?.tagList || []
  const [selectedTag, setselectedTag] = useState<string[]>([])
  const [pageQueryBody, setPageQueryBody] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPage: 0,
  })

  const [queryBody, setQueryBody] = useState({
    page: 1,
    pageSize: 10,
    search,
    tags: selectedTag,
  })

  // reset query
  useEffect(() => {
    setQueryBody(prev => ({
      ...prev,
      page: 1,
      tags: selectedTag,
      search: search
    }))
  }, [selectedTag, search])

  const listTemplateReposistory = useQuery(
    ['template-repository-list', 'template-repository-public', queryBody],
    () => {
      return listTemplateRepository({
        page: queryBody.page,
        pageSize: queryBody.pageSize,
      }, queryBody.tags, queryBody.search)
    },
  )

  useEffect(() => {
    if (listTemplateReposistory.isFetched && listTemplateReposistory.isSuccess && listTemplateReposistory.data) {
      const data = listTemplateReposistory.data.page
      setPageQueryBody(prev => ({
        ...prev,
        totalItems: data.totalItems || 0,
        totalPage: data.totalPage || 0,
        page: data.page || 1
      }))
    }
  }, [listTemplateReposistory.data])  // 添加依赖项

  const tempalteReposistoryList = listTemplateReposistory.data?.templateRepositoryList || []
  return <TabPanel p={0} height={'full'}>
    <Flex gap="8px" height={'full'}>
      {/* Left Sidebar */}
      <Box w="150px">
        <Heading as="h3" size="sm" color={'grayModern.600'} mb="2">
          {t('tags')}
        </Heading>
        <Flex direction="column" gap="2px">
          {tags.map((tag, index) => (
            <Flex
              key={index}
              align="center"
              gap="8px"
              h={'36px'}
            >
              <TagCheckbox defaultChecked={index < 2}
                isChecked={selectedTag.includes(tag.uid)}
                onChange={(e) => {
                  const selected = e.target.checked
                  setselectedTag(
                    produce(selectedTag, (draft) => {
                      if (selected) draft.push(tag.uid)
                      else draft.splice(draft.indexOf(tag.uid), 1)
                    })
                  )
                }}
              ></TagCheckbox>
              <Text fontWeight={500} fontSize={'14px'} color={'grayModern.600'}>
                {
                  tag[lastLang === 'zh' ? 'zhName' : 'enName'] || tag.name
                }
              </Text>
            </Flex>
          ))}
        </Flex>
      </Box>

      {/* Right Content */}
      <Flex flex="1" flexDir={'column'} >
        <Text
          color={'grayModern.600'} mb="16px"
          fontSize='18px'
          fontWeight={500}
        >
          {t('all_templates')}
        </Text>
        <Box width={'full'} flex={1} h={'400px'} overflow={'auto'}
          position={'relative'}
        >
          <Grid templateColumns="repeat(3, 1fr)" gap="20px"
            inset={0}
            position={'absolute'}
            gridAutoRows={'max-content'}
          >
            {tempalteReposistoryList.map((tr) => {
              return <TemplateCard key={tr.uid}
                w={'273px'}
                iconId={tr.iconId || ''}
                templateRepositoryName={tr.name}
                templateRepositoryDescription={tr.description || ''}
                templateRepositoryUid={tr.uid}
                tags={tr.templateRepositoryTags.map(t => t.tag)}
                isPublic
              />
            })}
          </Grid>
        </Box>
        <Flex>
          <SwitchPage
            ml={'auto'}
            mr={'0'}
            mt={'8px'}
            pageSize={10}
            totalPage={pageQueryBody.totalPage}
            totalItem={pageQueryBody.totalItems}
            currentPage={pageQueryBody.page}
            setCurrentPage={(currentPage) => {
              setPageQueryBody(page => {
                return {
                  ...page,
                  page: currentPage,
                }
              })
              setQueryBody(page => {
                return {
                  ...page,
                  page: currentPage,
                }
              })
            }}
          />
        </Flex>
      </Flex>
    </Flex>
  </TabPanel>;
}