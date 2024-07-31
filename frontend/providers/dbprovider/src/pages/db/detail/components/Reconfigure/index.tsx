import { applyYamlList, getConfigByName } from '@/api/db';
import MyIcon from '@/components/Icon';
import { DBReconfigureMap } from '@/constants/db';
import type { DBDetailType } from '@/types/db';
import { I18nCommonKey } from '@/types/i18next';
import { json2Reconfigure } from '@/utils/json2Yaml';
import { adjustDifferencesForIni, flattenObject, parseConfig } from '@/utils/tools';
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
  useDisclosure
} from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import React, { ForwardedRef, forwardRef, useEffect, useRef, useState } from 'react';
import ConfigTable, { ConfigTableRef, Difference } from './ConfigTable';
import History from './History';

export type ComponentRef = {
  openBackup: () => void;
};

enum SubMenuEnum {
  Parameter = 'parameter',
  History = 'history'
}

const ReconfigureTable = ({ db }: { db?: DBDetailType }, ref: ForwardedRef<ComponentRef>) => {
  if (!db) return <></>;

  const { t } = useTranslation();
  const { message: toast } = useMessage();
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [subMenu, setSubMenu] = useState<SubMenuEnum>(SubMenuEnum.Parameter);
  const configTableRef = useRef<ConfigTableRef>(null);
  const [differences, setDifferences] = useState<Difference[]>([]);
  const [hasDifferences, setHasDifferences] = useState(false);

  const handleDifferenceChange = (hasDiff: boolean) => {
    setHasDifferences(hasDiff);
  };

  const parseSubMenu = (subMenu: string | string[] | undefined): SubMenuEnum => {
    return subMenu === SubMenuEnum.History ? SubMenuEnum.History : SubMenuEnum.Parameter;
  };

  useEffect(() => {
    router.query?.subMenu && setSubMenu(parseSubMenu(router.query.subMenu as string));
  }, [router.query?.subMenu]);

  const updateSubMenu = (newSubMenu: SubMenuEnum) => {
    setSubMenu(newSubMenu);
    router.push({
      query: { ...router.query, subMenu: newSubMenu }
    });
  };

  const { data: config } = useQuery(
    ['getConfigByName', db.dbName, db.dbType, subMenu],
    async () => {
      const _config = await getConfigByName({ name: db.dbName, dbType: db.dbType });
      const temp = parseConfig({
        configString: _config,
        type: DBReconfigureMap[db.dbType].type
      });
      const result = flattenObject(temp).map((item, index) => ({
        ...item,
        isEditing: false,
        isEdited: false,
        originalIndex: index
      }));
      return result;
    },
    {
      enabled: !!db.dbName
    }
  );

  const handleReconfigure = async () => {
    try {
      const differences = configTableRef.current?.submit();
      if (!differences) return;
      const reconfigureType = DBReconfigureMap[db.dbType].type;
      const reconfigureYaml = json2Reconfigure(
        db.dbName,
        db.dbType,
        db.id,
        adjustDifferencesForIni(differences, reconfigureType, db.dbType)
      );
      await applyYamlList([reconfigureYaml], 'create');
      onClose();
      router.push({
        query: {
          ...router.query,
          subMenu: SubMenuEnum.History
        }
      });
      toast({ title: t('Success'), status: 'success' });
    } catch (error) {
      toast({ title: t('have_error'), status: 'error' });
    }
  };

  const SubNavList = [
    { label: t('dbconfig.parameter'), value: SubMenuEnum.Parameter },
    { label: t('dbconfig.change_history'), value: SubMenuEnum.History }
  ];

  const handleSubmit = () => {
    if (configTableRef.current) {
      const changedConfigs = configTableRef.current.submit();
      if (changedConfigs.length === 0) {
        return toast({
          title: t('dbconfig.no_changes'),
          status: 'success'
        });
      }
      setDifferences(changedConfigs);
      onOpen();
    }
  };

  return (
    <Flex flexDirection={'column'} h={'full'} w={'full'} position={'relative'}>
      <Flex mx={'26px'}>
        {SubNavList.map((item) => (
          <Box
            key={item.label}
            mr={5}
            pb={2}
            borderBottom={'2px solid'}
            cursor={'pointer'}
            fontSize={'lg'}
            {...(item.value === subMenu
              ? {
                  color: 'black',
                  borderBottomColor: 'black'
                }
              : {
                  color: 'grayModern.600',
                  borderBottomColor: 'transparent',
                  onClick: () => {
                    updateSubMenu(item.value);
                  }
                })}
          >
            {t(item.label as I18nCommonKey)}
          </Box>
        ))}
        {subMenu === SubMenuEnum.Parameter && hasDifferences && (
          <Flex ml={'auto'}>
            <Button mr={5} minW={'72px'} h={'36px'} variant={'outline'} onClick={handleSubmit}>
              {t('dbconfig.commit')}
            </Button>
            <Button
              minW={'72px'}
              h={'36px'}
              variant={'outline'}
              onClick={() => {
                configTableRef.current?.reset();
                setHasDifferences(false);
              }}
            >
              {t('Cancel')}
            </Button>
          </Flex>
        )}
      </Flex>

      <Box mt={'8px'} flex={'1 0 0'} h={'0'}>
        {subMenu === SubMenuEnum.Parameter && config && (
          <ConfigTable
            ref={configTableRef}
            initialData={config}
            onDifferenceChange={handleDifferenceChange}
          />
        )}
        {subMenu === SubMenuEnum.History && db && <History db={db} />}
      </Box>

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        lockFocusAcrossFrames={false}
        closeOnOverlayClick={false}
      >
        <ModalOverlay />
        <ModalContent maxH={'90vh'} maxW={'90vw'} minW={'600px'} w={'auto'}>
          <ModalHeader display={'flex'}>
            {t('prompt')}
            {db.dbType === 'mongodb' && (
              <Flex alignItems={'center'}>
                <MyIcon
                  ml={'12px'}
                  color={'#0884DD'}
                  name={'warningInfo'}
                  width={'14px'}
                  height={'14px'}
                />
                <Text fontSize={'base'} ml={'4px'} color={'brightBlue.600'} fontWeight={'bold'}>
                  {t('dbconfig.updates_tip')}
                </Text>
              </Flex>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text color={'grayModern.900'} fontSize={'md'} fontWeight={'bold'}>
              {t('dbconfig.confirm_updates')}
            </Text>
            <Box mt={'12px'}>
              <Flex
                py={'6px'}
                gap={'8px'}
                px={'24px'}
                color={'grayModern.600'}
                bg={'grayModern.100'}
              >
                <Text flex={1} minW={'220px'}>
                  {t('dbconfig.parameter_name')}
                </Text>
                <Text flex={1}>{t('dbconfig.parameter_value')}</Text>
                <Text flex={1}>{t('dbconfig.modified_value')}</Text>
              </Flex>
              {differences.map((diff, index) => (
                <Flex
                  py={'6px'}
                  px={'24px'}
                  key={index}
                  color={diff.newValue ? 'grayModern.600' : 'red'}
                  fontSize={'md'}
                  mt={'4px'}
                  gap={'8px'}
                >
                  <Text flex={1} minW={'220px'} color={'grayModern.900'}>
                    {diff.path}
                  </Text>
                  <Text flex={1}>{diff.oldValue}</Text>
                  <Text flex={1}>{diff.newValue}</Text>
                </Flex>
              ))}
            </Box>
          </ModalBody>
          <ModalFooter gap={'8px'}>
            <Button
              variant={'outline'}
              w={'80px'}
              onClick={() => {
                onClose();
              }}
            >
              {t('Cancel')}
            </Button>
            <Button w={'80px'} onClick={handleReconfigure}>
              {t('confirm')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
};

export default React.memo(forwardRef(ReconfigureTable));
