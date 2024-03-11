import MyIcon from '@/components/Icon';
import MySelect from '@/components/Select';
import { FormSourceInput, TemplateSourceType } from '@/types/app';
import { Box, Flex, FormControl, Input, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';

const Form = ({
  formSource,
  formHook
}: {
  formSource: TemplateSourceType;
  formHook: UseFormReturn;
}) => {
  if (!formHook) return null;
  const { t } = useTranslation();

  const isShowContent = useMemo(
    () => !!formSource?.source?.inputs?.length,
    [formSource?.source?.inputs?.length]
  );

  const {
    register,
    formState: { errors }
  } = formHook;

  return (
    <Box flexGrow={1} id={'baseInfo'} minH={'200px'}>
      {isShowContent ? (
        <Box py={'24px'}>
          {formSource?.source?.inputs?.map((item: FormSourceInput, index: number) => {
            if (item.type === 'choice' && item.options) {
              return (
                <FormControl key={item?.key} mb={7} isInvalid={!!errors.appName}>
                  <Flex alignItems={'center'} align="stretch">
                    <Flex
                      position={'relative'}
                      w="200px"
                      className="template-dynamic-label"
                      color={'#333'}
                      userSelect={'none'}
                    >
                      {item?.label}
                      {item?.required && (
                        <Text ml="2px" color={'#E53E3E'}>
                          *
                        </Text>
                      )}
                    </Flex>
                    <Box maxW={'500px'} ml={'17px'} w={'100%'}>
                      <MySelect
                        w={'100%'}
                        bg={'transparent'}
                        borderRadius={'2px'}
                        value={formHook.getValues(item.key) || item.default}
                        list={item.options?.map((option) => {
                          return {
                            value: option,
                            label: option
                          };
                        })}
                        onchange={(val: any) => {
                          formHook.setValue(item.key, val);
                        }}
                      />
                    </Box>
                  </Flex>
                </FormControl>
              );
            }
            return (
              <FormControl key={item?.key} mb={7} isInvalid={!!errors.appName}>
                <Flex alignItems={'center'} align="stretch">
                  <Flex
                    position={'relative'}
                    w="200px"
                    className="template-dynamic-label"
                    color={'#333'}
                    userSelect={'none'}
                  >
                    {item?.label}
                    {item?.required && (
                      <Text ml="2px" color={'#E53E3E'}>
                        *
                      </Text>
                    )}
                  </Flex>
                  <Input
                    type={item?.type}
                    maxW={'500px'}
                    ml={'20px'}
                    defaultValue={item?.default}
                    placeholder={item?.description}
                    {...register(item?.key, {
                      required: item?.required
                    })}
                  />
                </Flex>
              </FormControl>
            );
          })}
        </Box>
      ) : (
        <Flex
          justifyContent={'center'}
          alignItems="center"
          h={'100%'}
          w={'100%'}
          flexDirection="column"
        >
          <Flex
            border={'1px dashed #9CA2A8'}
            borderRadius="50%"
            w={'48px'}
            h={'48px'}
            justifyContent="center"
            alignItems={'center'}
          >
            <MyIcon color={'#7B838B'} name="empty"></MyIcon>
          </Flex>
          <Text mt={'12px'} fontSize={14} color={'#5A646E'}>
            {t('Not need to configure any parameters')}
          </Text>
        </Flex>
      )}
    </Box>
  );
};

export default Form;
