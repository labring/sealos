import { Flex, Img, Link } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import uil_info_circle from '@/assert/uil_info-circle.svg';

export default function Index({ text, href }: { text: string; href?: string }) {
  const { t } = useTranslation();
  return (
    <Flex align={'center'}>
      <Img src={uil_info_circle.src} w={'18px'} h="18px" mr={'5px'}></Img>
      <Link
        fontStyle="normal"
        fontWeight="400"
        fontSize="12px"
        color="#1D8CDC"
        {...(href
          ? {
              href: href
            }
          : {})}
      >
        {text}
      </Link>
    </Flex>
  );
}
