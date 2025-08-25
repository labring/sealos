import uil_info_circle from '@/assert/uil_info-circle.svg';
import { Flex, Img, Link } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';

export default function Index({ text, href }: { text: string; href?: string }) {
  const { t } = useTranslation();
  return (
    <Flex align={'center'}>
      <Img src={uil_info_circle.src} boxSize={'16px'} mr={'4px'}></Img>
      <Link
        fontStyle="normal"
        fontWeight="400"
        fontSize="12px"
        color="brightBlue.600"
        textDecoration={'underline'}
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
