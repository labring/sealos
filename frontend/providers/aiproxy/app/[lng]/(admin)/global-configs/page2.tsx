'use client'
import React, { useState, useEffect } from 'react'
import {
  Box,
  Button,
  VStack,
  FormControl,
  IconButton,
  Divider,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Text,
  Spinner,
  Center,
  useDisclosure
} from '@chakra-ui/react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2 } from 'lucide-react'
import { SingleSelectCombobox } from '@/components/common/SingleSelectCombobox'
import { MultiSelectCombobox } from '@/components/common/MultiSelectCombobox'
import { ConstructModeMappingComponent } from '@/components/common/ConstructModeMappingComponent'
import { ModelType } from '@/types/models/model'
import { getEnumKeyByValue } from '@/utils/common'
import { useMessage } from '@sealos/ui'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { useQuery } from '@tanstack/react-query'
import { getBuiltInSupportModels, getDefaultEnabledModels } from '@/api/platform'

// 类型定义
type ModelTypeKey = keyof typeof ModelType

type Model = {
  name: string
  isDefault: boolean
}

// 每个配置项的数据结构
type ConfigItem = {
  type: ModelTypeKey | null
  selectedModels: Model[]
  modelMapping: Record<string, string>
}

// 表单验证schema
const schema = z.object({
  configs: z.array(
    z.object({
      type: z.number(),
      models: z.array(z.string()).default([]),
      model_mapping: z.record(z.string(), z.any()).default({})
    })
  )
})

type FormData = z.infer<typeof schema>

function UpdateMultiChannelModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { message } = useMessage()

  // 配置列表状态
  const [configs, setConfigs] = useState<ConfigItem[]>([
    {
      type: null,
      selectedModels: [],
      modelMapping: {}
    }
  ])

  // react-hook-form 配置
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
    watch
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      configs: [
        {
          type: undefined,
          models: [],
          model_mapping: {}
        }
      ]
    }
  })

  // 使用 useFieldArray 管理多个表单项
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'configs'
  })

  // 获取支持的模型数据
  const { isLoading: isBuiltInSupportModelsLoading, data: builtInSupportModels } = useQuery({
    queryKey: ['models'],
    queryFn: () => getBuiltInSupportModels()
  })

  const { isLoading: isDefaultEnabledModelsLoading, data: defaultEnabledModels } = useQuery({
    queryKey: ['defaultEnabledModels'],
    queryFn: () => getDefaultEnabledModels()
  })

  // 处理模型类型变更
  const handleModelTypeChange = (index: number, value: ModelTypeKey | null) => {
    const newConfigs = [...configs]
    newConfigs[index].type = value
    newConfigs[index].selectedModels = []
    newConfigs[index].modelMapping = {}
    setConfigs(newConfigs)

    if (value) {
      setValue(`configs.${index}.type`, Number(ModelType[value]))
    }
  }

  // 处理选中模型变更
  const handleSelectedModelsChange = (index: number, models: Model[]) => {
    const newConfigs = [...configs]
    newConfigs[index].selectedModels = models
    newConfigs[index].modelMapping = {}
    setConfigs(newConfigs)

    setValue(
      `configs.${index}.models`,
      models.map((m) => m.name)
    )
  }

  // 处理模型映射变更
  const handleModelMappingChange = (index: number, mapping: Record<string, string>) => {
    const newConfigs = [...configs]
    newConfigs[index].modelMapping = mapping
    setConfigs(newConfigs)

    setValue(`configs.${index}.model_mapping`, mapping)
  }

  // 添加新配置
  const handleAddConfig = () => {
    setConfigs([
      ...configs,
      {
        type: null,
        selectedModels: [],
        modelMapping: {}
      }
    ])
    append({
      type: undefined,
      models: [],
      model_mapping: {}
    })
  }

  // 移除配置
  const handleRemoveConfig = (index: number) => {
    const newConfigs = configs.filter((_, i) => i !== index)
    setConfigs(newConfigs)
    remove(index)
  }

  // 表单提交
  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      // 处理提交的数据
      console.log('提交的数据:', data.configs)
      // ... 其他提交逻辑
    } catch (error) {
      // ... 错误处理
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      {isOpen &&
        (isBuiltInSupportModelsLoading || isDefaultEnabledModelsLoading ? (
          <Center w="530px" h="768px">
            <Spinner />
          </Center>
        ) : (
          <>
            <ModalOverlay />
            <ModalContent minW="530px" minH="768px" borderRadius="10px" background="white">
              <ModalHeader>
                <Text>{t('channels.create')}</Text>
              </ModalHeader>
              <ModalCloseButton />

              <ModalBody w="full" h="full" m="0" p="24px 36px 24px 36px">
                <VStack as="form" spacing="24px" align="stretch">
                  {fields.map((field, index) => (
                    <Box
                      key={field.id}
                      position="relative"
                      p={4}
                      borderWidth="1px"
                      borderRadius="md">
                      <IconButton
                        aria-label="删除配置"
                        icon={<Trash2 />}
                        position="absolute"
                        right={2}
                        top={2}
                        size="sm"
                        onClick={() => remove(index)}
                        isDisabled={fields.length === 1}
                      />

                      <VStack spacing={4}>
                        <FormControl isInvalid={!!errors?.configs?.[index]?.type} isRequired>
                          <Controller
                            name={`configs.${index}.type`}
                            control={control}
                            render={({ field }) => (
                              <SingleSelectCombobox<ModelTypeKey>
                                dropdownItems={Object.keys(ModelType) as ModelTypeKey[]}
                                setSelectedItem={(type) => {
                                  if (type) {
                                    field.onChange(
                                      Number(ModelType[type as keyof typeof ModelType])
                                    )
                                    // 清空当前配置的模型选择
                                    setValue(`configs.${index}.models`, [])
                                    setValue(`configs.${index}.model_mapping`, {})
                                  }
                                }}
                                handleDropdownItemFilter={(items, input) => {
                                  return items.filter(
                                    (item) =>
                                      !input || item.toLowerCase().includes(input.toLowerCase())
                                  )
                                }}
                                handleDropdownItemDisplay={(item) => item}
                              />
                            )}
                          />
                        </FormControl>

                        <FormControl isInvalid={!!errors?.configs?.[index]?.models}>
                          <Controller
                            name={`configs.${index}.models`}
                            control={control}
                            render={({ field }) => (
                              <MultiSelectCombobox<Model>
                                dropdownItems={[]} // 需要根据选中的类型填充可选模型列表
                                selectedItems={field.value.map((name) => ({
                                  name,
                                  isDefault: false
                                }))}
                                setSelectedItems={(models) => {
                                  field.onChange(models.map((m) => m.name))
                                  // 清空当前配置的映射
                                  setValue(`configs.${index}.model_mapping`, {})
                                }}
                                handleFilteredDropdownItems={(items, selected, input) => {
                                  return items.filter(
                                    (item) =>
                                      !selected.includes(item) &&
                                      (!input ||
                                        item.name.toLowerCase().includes(input.toLowerCase()))
                                  )
                                }}
                                handleDropdownItemDisplay={(item) => item.name}
                                handleSelectedItemDisplay={(item) => item.name}
                                handleSetCustomSelectedItem={(item) => ({
                                  name: item,
                                  isDefault: false
                                })}
                              />
                            )}
                          />
                        </FormControl>

                        <FormControl isInvalid={!!errors?.configs?.[index]?.model_mapping}>
                          <Controller
                            name={`configs.${index}.model_mapping`}
                            control={control}
                            render={({ field }) => (
                              <ConstructModeMappingComponent
                                mapKeys={watch(`configs.${index}.models`).map((name) => ({
                                  name,
                                  isDefault: false
                                }))}
                                mapData={field.value}
                                setMapData={field.onChange}
                              />
                            )}
                          />
                        </FormControl>
                      </VStack>
                    </Box>
                  ))}

                  <Flex justify="center">
                    <Button
                      onClick={() =>
                        append({
                          type: undefined,
                          models: [],
                          model_mapping: {}
                        })
                      }>
                      {t('channels.addConfig')}
                    </Button>
                  </Flex>
                </VStack>
              </ModalBody>

              <ModalFooter>
                <Button onClick={onClose} mr={3}>
                  取消
                </Button>
                <Button colorScheme="blue" onClick={handleSubmit(onSubmit)}>
                  确认
                </Button>
              </ModalFooter>
            </ModalContent>
          </>
        ))}
    </Modal>
  )
}

export default function GlobalConfigsPage() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  return (
    <>
      <Flex gap="13px" marginBottom="12px">
        <Button onClick={() => onOpen()}>打开</Button>
        <UpdateMultiChannelModal isOpen={isOpen} onClose={() => onClose()} />
      </Flex>
    </>
  )
}
