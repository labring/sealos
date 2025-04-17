import { listTag } from '@/api/template';
import MyFormLabel from '@/components/MyFormControl';
import { Tag, TagType } from '@/prisma/generated/client';
import { createTagSelectorStore } from '@/stores/tagSelector';
import { Alert, Box, Divider, Flex, Text } from '@chakra-ui/react';
import { InfoCircleIcon } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { createContext, useRef } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { TagCheckbox } from '../../TagCheckbox';

const TagSelectorStoreCtx = createContext<ReturnType<typeof createTagSelectorStore> | null>(null);

const TagList = ({ tags, title }: { tags: Tag[]; title: string }) => {
  const locale = useLocale();
  const { control } = useFormContext<{ tags: Array<{ value: string }> }>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tags'
  });
  const containTag = (tagUid: string) => fields.findIndex((t) => t.value === tagUid) > -1;
  const handleTagClick = (tag: Tag, isChecked: boolean) => {
    const index = fields.findIndex((t) => t.value === tag.uid);
    if (!isChecked) {
      if (index === -1) {
        return;
      }
      remove(index);
    } else {
      if (index > -1) {
        return;
      }
      append({ value: tag.uid });
    }
  };
  return (
    <Box>
      <Text fontSize="12px" fontWeight={500} color={'grayModern.600'} mb={'4px'}>
        {title}
      </Text>
      <Flex gap={'8px'} wrap="wrap" width={'350px'}>
        {tags.map((tag) => (
          <Flex key={tag.uid} px={'8px'} py={'4px'} bg="grayModern.50" borderRadius="full">
            <TagCheckbox
              name={`tag-${tag.uid}`}
              isChecked={containTag(tag.uid)}
              onChange={(e) => handleTagClick(tag, e.target.checked)}
            >
              <Text color={'grayModern.900'}>
                {tag[locale === 'zh' ? 'zhName' : 'enName'] || tag.name}
              </Text>
            </TagCheckbox>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
};
export default function TemplateRepositoryTagField() {
  const tagsQuery = useQuery(['template-repository-tags'], listTag, {
    staleTime: Infinity,
    cacheTime: Infinity
  });
  const tagList = (tagsQuery.data?.tagList || []).filter((tag) => tag.name !== 'official');
  let tagListCollection = tagList.reduce(
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
  const tagSelectorStore = useRef(createTagSelectorStore()).current;

  const t = useTranslations();
  return (
    <Flex align={'center'}>
      <MyFormLabel isRequired width="108px" m="0" fontSize="14px" alignSelf={'flex-start'}>
        {t('tags')}
      </MyFormLabel>

      <Box width={'350px'}>
        <Box mb={'12px'}>
          <TagSelectorStoreCtx.Provider value={tagSelectorStore}>
            <TagList tags={tagListCollection[TagType.USE_CASE]} title={t('use_case')} />
            <Divider my={'12px'} color={'grayModern.150'} />
            <TagList
              tags={tagListCollection[TagType.PROGRAMMING_LANGUAGE]}
              title={t('programming_language')}
            />
          </TagSelectorStoreCtx.Provider>
        </Box>
        <Alert
          status="info"
          borderRadius="md"
          py={'6px'}
          px={'12px'}
          color={'brightBlue.600'}
          bgColor={'brightBlue.50'}
        >
          <InfoCircleIcon fill={'currentcolor'} mr={'4px'} boxSize={'14px'} />
          <Text fontSize="12px" fontWeight={500}>
            {t('select_tag_tips')}
          </Text>
        </Alert>
      </Box>
    </Flex>
  );
}
