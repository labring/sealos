'use client';

import MyIcon from '@/components/Icon';
import { TemplateState } from '@/constants/template';
import { usePathname } from '@/i18n';
import { useTemplateStore } from '@/stores/template';
import {
  calc,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Tab,
  TabList,
  TabPanels,
  Tabs,
  Text
} from '@chakra-ui/react';
import { SearchIcon } from '@sealos/ui';
import { debounce } from 'lodash';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import PrivatePanel from './PrivatePanel';
import PublicPanel from './PublicPanel';

const TemplateModal = () => {
  const t = useTranslations();
  const { isOpen, config, closeTemplateModal, openTemplateModal, updateTemplateModalConfig } =
    useTemplateStore();
  const [search, setsearch] = useState('');
  const updateSearchVal = useCallback(
    debounce((val: string) => {
      setsearch(val);
    }, 500),
    []
  );
  const lastRoute = usePathname();
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        closeTemplateModal();
        updateTemplateModalConfig({
          templateState: TemplateState.publicTemplate,
          lastRoute
        });
      }}
      lockFocusAcrossFrames={false}
    >
      <ModalOverlay />
      <ModalContent
        h={calc('100%').subtract(calc('24px').multiply(2).toString()).toString()}
        maxW={'full'}
        margin={'24px'}
      >
        <ModalHeader>{t('devbox_template')}</ModalHeader>
        <ModalBody pb={'16px'}>
          <ModalCloseButton />
          {/* <Box left="0" top="12" h={'full'}> */}
          <Tabs
            variant="soft-rounded"
            colorScheme="blue"
            isLazy
            h={'full'}
            display={'flex'}
            flexDirection={'column'}
            index={config.templateState === TemplateState.publicTemplate ? 0 : 1}
            onChange={(idx) => {
              if (idx === 0)
                openTemplateModal({
                  templateState: TemplateState.publicTemplate,
                  lastRoute
                });
              else
                openTemplateModal({
                  templateState: TemplateState.privateTemplate,
                  lastRoute
                });
            }}
          >
            {/* TabList must be direct child of Tabs */}
            <TabList gap={'12px'}>
              <Tab
                display="flex"
                justifyContent="center"
                alignItems="center"
                padding="8px"
                gap="4px"
                borderRadius="6px"
                color="grayModern.500"
                _selected={{
                  bg: 'grayModern.100',
                  color: 'brightBlue.600'
                }}
              >
                <MyIcon width="20px" height="20px" color="currentColor" name="templateTitle" />
                <Text
                  fontSize="14px"
                  fontWeight="500"
                  lineHeight="20px"
                  letterSpacing="0.1px"
                  fontFamily="PingFang SC"
                >
                  {t('all_templates')}
                </Text>
              </Tab>
              <Tab
                display="flex"
                justifyContent="center"
                alignItems="center"
                padding="8px"
                gap="4px"
                borderRadius="6px"
                color="grayModern.500"
                _selected={{
                  bg: 'grayModern.100',
                  color: 'brightBlue.600'
                }}
              >
                <MyIcon width="20px" height="20px" color="currentColor" name={'user'} />
                <Text
                  fontSize="14px"
                  fontWeight="500"
                  lineHeight="20px"
                  letterSpacing="0.1px"
                  fontFamily="PingFang SC"
                >
                  {t('my_templates')}
                </Text>
              </Tab>
              <InputGroup w="230px" marginLeft={'auto'} mr={0}>
                <InputLeftElement>
                  <SearchIcon boxSize={'16px'} color="grayModern.600" fill={'currentcolor'} />
                </InputLeftElement>
                <Input
                  h="32px"
                  py={'8px'}
                  border="1px"
                  borderColor={'grayModern.250'}
                  bgColor={'grayModern.50'}
                  rounded="md"
                  placeholder={t('template_search')}
                  onChange={(e) => {
                    updateSearchVal(e.target.value);
                  }}
                />
              </InputGroup>
            </TabList>

            {/* TabPanels must be direct child of Tabs */}
            <TabPanels mt={'16px'} flex={1}>
              <PublicPanel search={search} />
              <PrivatePanel search={search} />
            </TabPanels>
          </Tabs>
          {/* </Box> */}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default TemplateModal;
