import { useOssStore } from '@/store/ossStore';
import { Flex, HStack, Link } from '@chakra-ui/react';

export default function PathLink() {
  const prefix = useOssStore((s) => s.prefix);
  const setPrefix = useOssStore((s) => s.setPrefix);
  const paths =
    prefix.reduce<{ path: string[]; name: string }[]>(
      (arr, cur) => {
        arr.push({ name: cur, path: [...arr[arr.length - 1].path, cur] });
        return arr;
      },
      [{ path: [], name: '' }]
    ) || [];
  return (
    <HStack gap="0" transitionDuration={'3s'}>
      {paths.map((v) => (
        <Flex key={v.path.join('/')} fontSize={'14px'}>
          <Link
            variant={'unstyled'}
            color={'grayModern.500'}
            _hover={{
              color: '#262A32'
            }}
            minW="max-content"
            onClick={() => {
              setPrefix(v.path);
            }}
          >
            {v.name}/
          </Link>
        </Flex>
      ))}
    </HStack>
  );
}
