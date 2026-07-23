import { Flex, FlexProps } from '@chakra-ui/react';

const EditListItem = ({
  isSelected = false,
  isMulti = false,
  children,
  ...props
}: { isSelected?: boolean; isMulti?: boolean } & FlexProps) => (
  <Flex
    px={'20px'}
    py={'14px'}
    borderLeft={'2px solid'}
    fontWeight="bold"
    gap="12px"
    align={'center'}
    {...(isMulti
      ? {
          cursor: 'pointer',
          _hover: {
            backgroundColor: 'white_.400'
          },
          ...(isSelected
            ? {
                color: 'grayModern.900',
                borderColor: 'grayModern.900',
                backgroundColor: 'frostyNightfall.100'
              }
            : {
                color: 'grayModern.500',
                borderColor: 'grayModern.200',
                backgroundColor: 'transparent'
              })
        }
      : {
          color: 'grayModern.900',
          borderColor: 'grayModern.900',
          backgroundColor: 'transparent'
        })}
    {...props}
  >
    {children}
  </Flex>
);
export default EditListItem;
