import MyIcon, { IconMap } from '@/components/Icon';
import { useCopyData } from '@/utils/tools';
import { Box, SimpleGrid } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function IconsPage() {
  const router = useRouter();
  const iconNames = Object.keys(IconMap) as Array<keyof typeof IconMap>;
  const { copyData } = useCopyData();

  const copyIconName = (iconName: string) => {
    const iconCode = `<MyIcon name="${iconName}" w={'16px'} h={'16px'} />`;
    copyData(iconCode);
  };

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      router.replace('/dbs');
    }
  }, [router]);

  return (
    <Box p={6}>
      <SimpleGrid columns={[2, 4, 6]} spacing={4}>
        {iconNames.map((iconName) => (
          <Box
            key={iconName}
            p={4}
            border="1px"
            borderColor="grayModern.200"
            borderRadius="md"
            cursor="pointer"
            onClick={() => copyIconName(iconName)}
            display="flex"
            flexDirection="column"
            alignItems="center"
            _hover={{ bg: 'grayModern.50' }}
          >
            <Box mb={2}>
              <MyIcon name={iconName} w={'32px'} h={'32px'} />
            </Box>
            <Box fontSize="14px" color="grayModern.600" textAlign="center" wordBreak="break-all">
              {iconName}
            </Box>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}
