import { Button, ButtonProps, Tooltip, VStack } from '@chakra-ui/react';
import { SortPolygonDownIcon, SortPolygonUpIcon } from '@sealos/ui';
import { SortDirection } from '@tanstack/react-table';
import { useTranslation } from 'next-i18next';

const SortButton = ({
  state,
  nextState,
  onClick,
  children,
  ...styles
}: {
  state: SortDirection | false;
  nextState: SortDirection | false;
} & ButtonProps) => {
  const { t } = useTranslation('file');
  const map = new Map<SortDirection | false, string>([
    [false, t('clickToCancelSort')],
    ['asc', t('clickToAscend')],
    ['desc', t('clickToDescend')]
  ]);
  return (
    <Tooltip
      hasArrow
      label={map.get(nextState)}
      placement="top"
      bg={'white'}
      color={'black'}
      py="8px"
      px="10.5px"
      fontSize={'12px'}
      borderRadius={'4px'}
    >
      <Button
        aria-label={'sort'}
        onClick={onClick}
        variant={'unstyled'}
        size={'xs'}
        display={'flex'}
        gap={'8px'}
        {...styles}
      >
        {children}
        <VStack gap={'4px'}>
          <SortPolygonUpIcon
            color={state === 'asc' ? 'brightBlue.600' : 'grayModern.600'}
            w={'6px'}
            h={'3.73px'}
          />
          <SortPolygonDownIcon
            color={state === 'desc' ? 'brightBlue.600' : 'grayModern.600'}
            w={'6px'}
            h={'3.73px'}
          />
        </VStack>
      </Button>
    </Tooltip>
  );
};

export default SortButton;
