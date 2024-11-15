import { listTag } from "@/api/template";
import MyFormLabel from "@/components/MyFormControl";
import { Alert, Flex, Stack, Text, VStack } from "@chakra-ui/react";
import { InfoCircleIcon } from "@sealos/ui";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useFieldArray, useFormContext } from "react-hook-form";
import { TagCheckbox } from "../../TagCheckbox";
export default function TemplateRepositoryTagField() {
  const tagsQuery = useQuery(
    ['template-repository-tags'],
    listTag,
    {
      staleTime: Infinity,
      cacheTime: Infinity,
    }
  )
  const tagList = (tagsQuery.data?.tagList || []).filter((tag) => tag.name !== 'official');
  const { control } = useFormContext< { tags: Array<{ value: string }> }>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tags',
  });
  const handleTagChange = (tagUid: string, isChecked: boolean) => {
    if (isChecked) {
      append({ value: tagUid });
    } else {
      const index = fields.findIndex((field) => field.value === tagUid);
      if (index !== -1) {
        remove(index);
      }
    }
  };
  const t = useTranslations()
  const locale = useLocale()
  return <Flex align={'center'}>
    <MyFormLabel isRequired width="108px" m='0' fontSize="14px">{t('tags')}</MyFormLabel>
    <VStack align="start" spacing={2}>
      <Stack direction={['column', 'row']} spacing={2} wrap="wrap" width={'350px'}>
        {tagList.map((tag) => (
          <Flex
            key={tag.uid}
            px={'8px'}
            py={'4px'}
            bg="grayModern.50"
            borderRadius="full"
          >
            <TagCheckbox
              name={`tag-${tag.uid}`}
              isChecked={fields.some((field) => field.value === tag.uid)}
              onChange={(e) => handleTagChange(tag.uid, e.target.checked)}
            >
              <Text color={'grayModern.900'}>{tag[locale === 'zh' ? 'zhName' : 'enName'] || tag.name}</Text>
            </TagCheckbox>
          </Flex>
        ))}
      </Stack>
      )
      <Alert status="info" borderRadius="md" py={'6px'} px={'12px'} color={'brightBlue.600'} bgColor={'brightBlue.50'}>
        <InfoCircleIcon fill={'currentcolor'} mr={'4px'} boxSize={'14px'} />
        <Text fontSize="12px" fontWeight={500}>
          {t('select_tag_tips')}
        </Text>
      </Alert>
    </VStack>
  </Flex>
}