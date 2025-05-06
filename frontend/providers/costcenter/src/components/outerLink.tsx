import uil_info_circle from '@/assert/uil_info-circle.svg';
import uil_info_circle_gray from '@/assert/uil_info-circle-gray.svg';
import { Flex, Img, Link, LinkProps } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';

export default function Index({
  text,
  href,
  color,
  textDecoration,
  target
}: {
  textDecoration?: LinkProps['textDecoration'];
  text: string;
  href?: string;
  color?: LinkProps['color'];
  target?: LinkProps['target'];
}) {
  const { t } = useTranslation();
  return (
    <Flex align={'center'}>
      <Img
        src={color ? uil_info_circle_gray.src : uil_info_circle.src}
        boxSize={'16px'}
        mr={'4px'}
      ></Img>
      <Link
        fontStyle="normal"
        fontWeight="400"
        fontSize="12px"
        color={color || 'brightBlue.600'}
        target={target}
        textDecoration={textDecoration || 'underline'}
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
