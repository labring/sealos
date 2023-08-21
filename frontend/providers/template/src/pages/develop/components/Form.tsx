import MyIcon from '@/components/Icon';
import { FormSourceInput, YamlSourceType } from '@/types/app';
import { Box, Flex, FormControl, Input, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';
import { UseFormReturn, useForm } from 'react-hook-form';

const Form = ({
  formSource,
  formHook
}: {
  formSource: YamlSourceType;
  formHook: UseFormReturn;
}) => {
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
                    autoFocus={true}
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
