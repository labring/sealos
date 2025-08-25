import { useCopyData } from '@/hooks/useCopyData';
import { Flex, FlexProps, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import MyIcon from '../Icon';

type CodeBlockProps = {
  flexStyle?: FlexProps;
  codeList: string[];
};

export default function CodeBlock({ flexStyle, codeList }: CodeBlockProps) {
  const { copyData } = useCopyData();
  const [hoveredIndex, setHoveredIndex] = useState<null | number>();
  const { t } = useTranslation();
  const isCopy = (value: string) => !value?.startsWith('#');

  if (!codeList) {
    return <></>;
  }

  return (
    <Flex
      position={'relative'}
      backgroundColor="#F8FAFB"
      borderRadius={'4px'}
      {...flexStyle}
      border={'1px solid #EAEBF0'}
      p="16px"
      gap="4px"
      flexDirection={'column'}
    >
      {codeList.map((item, index) => {
        return (
          <Flex
            key={item}
            fontSize={'12px'}
            fontWeight={500}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            alignItems={'center'}
          >
            <Text color={'#9CA2A8'} w="26px" alignSelf={'flex-start'}>
              {index + 1}
            </Text>
            <Text color={isCopy(item) ? '#24282C' : '#7B838B'}>{item}</Text>
            {isCopy(item) && hoveredIndex === index ? (
              <MyIcon
                cursor={'pointer'}
                ml="20px"
                name="copy"
                w="14px"
                h="14px"
                color={'#219BF4'}
                onClick={() => copyData(item)}
              />
            ) : (
              <></>
            )}
          </Flex>
        );
      })}
    </Flex>
  );
}
