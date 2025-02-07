import MyIcon from '@/components/Icon';
import { ChevronDownIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  ButtonProps,
  HStack,
  Img,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  useDisclosure,
  VStack
} from '@chakra-ui/react';

const TemplateButton = ({
  isActive = false,
  icon,
  title,
  description,
  onClick,
  isInMenu = false,
  ...props
}: ButtonProps & {
  icon: React.ReactNode;
  title: string;
  isActive?: boolean;
  isInMenu?: boolean;
  description: string;
}) => {
  return (
    <Button
      variant={'unstyled'}
      w="400px"
      h="74px"
      bg="#F7F8FA"
      border="1px solid"
      borderColor={isActive ? '#219BF4' : '#E8EBF0'}
      borderRadius="8px"
      position="relative"
      cursor="pointer"
      boxShadow={isActive ? '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)' : 'none'}
      onClick={onClick}
      {...props}
    >
      <HStack spacing="12px" position="absolute" left="16px" top="50%" transform="translateY(-50%)">
        <Box w="32px" h="32px">
          {icon}
        </Box>
        <Box width={'200px'} h={'40px'}>
          <Text
            fontSize="16px"
            fontWeight="500"
            lineHeight="24px"
            letterSpacing="0.15px"
            color={isActive ? '#0884DD' : '#111824'}
            overflow={'hidden'}
            textOverflow={'ellipsis'}
            whiteSpace={'nowrap'}
            width={'200px'}
            textAlign={'left'}
          >
            {title}
          </Text>
          <Text
            fontSize="12px"
            lineHeight="16px"
            letterSpacing="0.004em"
            color={isActive ? '#0884DD' : '#667085'}
            overflow={'hidden'}
            width={'auto'}
            textOverflow={'ellipsis'}
            whiteSpace={'nowrap'}
            textAlign={'left'}
          >
            {description}
          </Text>
        </Box>
      </HStack>
      {!isActive && !isInMenu && (
        <ChevronDownIcon
          position="absolute"
          right="16px"
          top="50%"
          transform="translateY(-50%)"
          w="20px"
          h="20px"
          color="#667085"
        />
      )}
      {isActive && (
        <MyIcon
          name="checkTemplate"
          position="absolute"
          right="16px"
          top="50%"
          transform="translateY(-50%)"
          boxSize="20px"
          color="#219BF4"
        />
      )}
    </Button>
  );
};
type TRepositoryItem = {
  iconId: string | null;
  name: string;
  description: string | null;
  uid: string;
};
export default function TemplateDropdown({
  templateRepositoryList,
  selectedTemplateRepoUid,
  setSelectedTemplateRepoUid
}: {
  templateRepositoryList: TRepositoryItem[];
  selectedTemplateRepoUid: string | null;
  setSelectedTemplateRepoUid: (uid: string) => void;
}) {
  const selectedTemplateRepository = templateRepositoryList.find(
    (t) => t.uid === selectedTemplateRepoUid
  );
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <Popover
      placement="bottom-start"
      isOpen={isOpen}
      onClose={() => isOpen && onClose()}
      onOpen={() => !isOpen && onOpen()}
    >
      <PopoverTrigger>
        <Box width={'400px'}>
          <TemplateButton
            userSelect={'none'}
            isActive={false}
            width={'400px'}
            icon={<Img src={`/images/${selectedTemplateRepository?.iconId || ''}.svg`} />}
            title={selectedTemplateRepository?.name || ''}
            description={selectedTemplateRepository?.description || ''}
          />
        </Box>
      </PopoverTrigger>
      {/* <Portal> */}
      <PopoverContent w="400px" p="12px" borderRadius="8px">
        <PopoverBody p={0}>
          <VStack spacing="8px" align="stretch">
            {templateRepositoryList.map(({ uid, iconId, description, name }) => (
              <TemplateButton
                key={uid}
                width={'full'}
                isActive={selectedTemplateRepoUid === uid}
                icon={<Img src={`/images/${iconId}.svg`} />}
                isInMenu
                title={name}
                description={description || ''}
                onClick={() => setSelectedTemplateRepoUid(uid)}
              />
            ))}
          </VStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}
