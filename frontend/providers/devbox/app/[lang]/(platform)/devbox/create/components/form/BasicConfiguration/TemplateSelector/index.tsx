// RuntimeVersionSelector.tsx
import { listTemplate } from '@/api/template'
import { useEnvStore } from '@/stores/env'
import { DevboxEditTypeV2 } from '@/types/devbox'
import { nanoid } from '@/utils/tools'
import { Flex, Input } from '@chakra-ui/react'
import { MySelect, useMessage } from '@sealos/ui'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useController, useFormContext } from 'react-hook-form'
import { z } from 'zod'
import Label from '../../Label'

interface TemplateSelectorProps {
  isEdit: boolean
}

export default function TemplateSelector({
  isEdit,
}: TemplateSelectorProps) {
  const { getValues, setValue, watch, control } = useFormContext<DevboxEditTypeV2>()
  const { env } = useEnvStore()
  const { message: toast } = useMessage()
  const templateRepositoryUid = watch('templateRepositoryUid')
  const isVaildTemplateRepositoryUid = z.string().uuid().safeParse(templateRepositoryUid).success
  const templateListQuery = useQuery(['templateList', templateRepositoryUid], () => listTemplate(templateRepositoryUid), {
    enabled: isVaildTemplateRepositoryUid,
  })
  const templateList = (templateListQuery.data?.templateList || [])
  const t = useTranslations()
  // const defaultTemplateUid = watch('templateUid')
  const menuList = templateList.map(v => ({ label: v.name, value: v.uid }))
  // const defaultTemplate = defaultTemplateUid ? templateList.find(t => t.uid === defaultTemplateUid) : templateList[0]
  const { field } = useController({
    control,
    name: 'templateUid',
    rules: {
      required: t('This runtime field is required')
    }
  })
  return (
    <Flex alignItems={'center'} mb={7}>
      <Label w={100}>{t('version')}</Label>
      {isEdit ? (
        <Input
          opacity={0.5}
          width={'200px'}
          defaultValue={field.value}
          disabled
        />
      ) : (
        <MySelect
          width={'200px'}
          placeholder={`${t('runtime')} ${t('version')}`}
          defaultValue={
            field.value
          }
          isDisabled={!templateListQuery.isSuccess}
          ref={field.ref}
          value={field.value}
          list={menuList}
          name={field.name}
          onchange={(val) => {
            if (isEdit) return
            const devboxName = getValues('name')
            if (!devboxName) {
              toast({
                title: t('Please enter the devbox name first'),
                status: 'warning'
              })
              return
            }
            // setValue('templateUid', val)
            field.onChange(val)
            const template = templateList.find(v => v.uid === val)!
            const parsedConfig =
              // {appPorts: [{ port: 80, name: 'todo!!!', protocol: 'HTTP' }]}
              JSON.parse(template.config as string) as { appPorts: [{ port: number, name: string, protocol: string }] }

            setValue(
              'templateConfig',
              template.config as string
            )
            setValue(
              'image',
              template.image
            )
            setValue(
              'networks',
              parsedConfig.appPorts.map(
                ({ port }) => ({
                  networkName: `${devboxName}-${nanoid()}`,
                  portName: nanoid(),
                  port: port,
                  protocol: 'HTTP',
                  openPublicDomain: true,
                  publicDomain: `${nanoid()}.${env.ingressDomain}`,
                  customDomain: ''
                } as const)
              )
            )
          }}
        />
      )}
    </Flex>
  )
}