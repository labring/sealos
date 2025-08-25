import { CheckIcon, StarIcon } from '@/components/Icon';
import { ServiceItem } from '@/constant/product';
import { Divider, Flex, Text } from '@chakra-ui/react';
import { ReactNode } from 'react';

type ServicePackageProps = {
  items: ServiceItem[];
  children: ReactNode;
};

export default function ServicePackage({ items, children }: ServicePackageProps) {
  return (
    <Flex
      bg="#FFF"
      border={'1px solid rgba(0, 0, 0, 0.05)'}
      borderRadius={'16px'}
      px="48px"
      pt="48px"
      flexDirection={'column'}
      w="400px"
      minH={'676px'}
    >
      {children}
      <Divider my="28px" color={'rgba(0, 0, 0, 0.10)'} />
      {items?.map((item) => (
        <Flex alignItems={'center'} key={item.label} mb="14px">
          {item.icon === 'check' ? <CheckIcon /> : <StarIcon fill={'#36ADEF'} />}
          <Text
            fontSize={'14px'}
            fontWeight={500}
            color={item.icon === 'check' ? '#485058' : '#0884DD'}
            ml="15px"
          >
            {item.label}
          </Text>
        </Flex>
      ))}
    </Flex>
  );
}
