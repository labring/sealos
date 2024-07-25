import MyIcon from '@/components/Icon';
import { DBTypeConfigMap } from '@/constants/db';
import { DBEditType } from '@/types/db';
import { compareDBConfig } from '@/utils/tools';
import {
  Box,
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea
} from '@chakra-ui/react';
import { debounce } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useEffect, useRef, useState } from 'react';

const EditConfig = ({
  defaultConfig,
  successCb,
  onClose,
  dbType,
  parameters = []
}: {
  defaultConfig: string;
  dbType: DBEditType['dbType'];
  successCb: (v: string) => void;
  onClose: () => void;
  parameters: { key: string; value: string }[];
}) => {
  const { t } = useTranslation();
  const [inputVal, setInputVal] = useState(defaultConfig);
  const type = DBTypeConfigMap[dbType].type;
  const [isDisabled, setIsDisabled] = useState(false);

  const [differences, setDifferences] = useState<
    {
      path: string;
      oldValue: string;
      newValue: string;
    }[]
  >([]);

  const debouncedDiff = useRef(
    debounce((newConfig: string) => {
      try {
        const diffs = compareDBConfig({
          oldConfig: defaultConfig,
          newConfig: newConfig,
          type: type
        });
        setDifferences(diffs);
        const hasDeletedKey = diffs.some((diff) => diff.newValue === undefined);
        setIsDisabled(hasDeletedKey);
      } catch (error) {
        console.error('Failed to parse config:', error);
        setDifferences([]);
      }
    }, 500)
  ).current;

  useEffect(() => {
    debouncedDiff(inputVal);
  }, [inputVal, debouncedDiff]);

  return (
    <Modal isOpen onClose={onClose} lockFocusAcrossFrames={false} closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent maxH={'90vh'} maxW={'90vw'} minW={'600px'} w={'auto'}>
        <ModalHeader>
          {parameters.length > 0 ? t('database_config') : t('database_edit_config')}
        </ModalHeader>
        <ModalCloseButton />
        {parameters.length > 0 ? (
          <ModalBody>
            {parameters.map((item, index) => (
              <Flex
                key={index}
                color={'grayModern.600'}
                fontSize={'base'}
                fontWeight={'bold'}
                gap={'4px'}
              >
                <Text>
                  {item.key}={item.value}
                </Text>
              </Flex>
            ))}
          </ModalBody>
        ) : (
          <ModalBody>
            <Box fontSize={'14px'} fontWeight={500} color={'messenger.900'} mb={'8px'}>
              {t('database_config')}
            </Box>
            <Textarea
              h={'350px'}
              maxH={'60vh'}
              maxW={'100%'}
              value={inputVal}
              resize={'both'}
              overflowX={'auto'}
              whiteSpace={inputVal === '' ? 'pre-wrap' : 'nowrap'}
              onChange={(e) => setInputVal(e.target.value)}
            />
            <Flex mt={'24px'} alignItems={'center'}>
              <Text color={'grayModern.900'} fontSize={'md'} fontWeight={'bold'}>
                {t('dbconfig.updates')}
              </Text>
              <MyIcon
                ml={'12px'}
                color={'#0884DD'}
                name={'warningInfo'}
                width={'14px'}
                height={'14px'}
              ></MyIcon>
              <Text fontSize={'base'} ml={'4px'} color={'brightBlue.600'} fontWeight={'bold'}>
                {t('dbconfig.updates_tip')}
              </Text>
            </Flex>
            <Box mt={'12px'}>
              {differences.length > 0 ? (
                differences.map((diff, index) => (
                  <Flex
                    key={index}
                    color={diff.newValue ? 'grayModern.600' : 'red'}
                    fontSize={'base'}
                    fontWeight={'bold'}
                    gap={'4px'}
                  >
                    <Text>
                      {diff.path}={diff.newValue}
                    </Text>
                  </Flex>
                ))
              ) : (
                <Text color={'grayModern.600'} fontSize={'base'} fontWeight={'bold'}>
                  {t('dbconfig.no_changes')}
                </Text>
              )}
            </Box>
          </ModalBody>
        )}
        {parameters.length > 0 ? (
          <ModalFooter></ModalFooter>
        ) : (
          <ModalFooter>
            <Button
              isDisabled={isDisabled}
              w={'88px'}
              onClick={() => {
                successCb(inputVal);
                onClose();
              }}
            >
              {t('confirm')}
            </Button>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
};

export default EditConfig;
