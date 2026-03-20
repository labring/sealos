import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  Box,
  Input,
  Flex,
  Link
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import MyFormControl from '@/components/FormControl';
import { useTranslation } from 'next-i18next';
import { MySelect, MyTooltip } from '@sealos/ui';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import { sealosApp } from 'sealos-desktop-sdk/app';
import type { AppEditType } from '@/types/app';

type SharePVCOption = {
  name: string;
  storageClassName: string;
  capacity: string;
};

const NetworkStoreModal = ({
  pvcList = [],
  listNames = [],
  successCb,
  closeCb
}: {
  pvcList: SharePVCOption[];
  listNames: string[];
  successCb: (e: AppEditType['networkStoreList'][number]) => void;
  closeCb: () => void;
}) => {
  const { t } = useTranslation();

  const {
    register,
    setValue,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      pvcName: '',
      path: ''
    }
  });

  const selectedPvc = watch('pvcName');

  const selectList = pvcList.map((pvc) => ({
    label: `${pvc.name} (${pvc.capacity})`,
    value: pvc.name
  }));

  return (
    <Modal isOpen onClose={closeCb} lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent maxW={'530px'}>
        <ModalHeader
          bg={'grayModern.25'}
          borderBottom={'1px solid'}
          borderColor={'grayModern.100'}
          fontSize={'16px'}
          fontWeight={500}
          py={'12px'}
        >
          {t('network_store_modal_title')}
        </ModalHeader>
        <ModalCloseButton top={'10px'} />
        <ModalBody py={'24px'} px={'36px'}>
          <Box mb={'24px'}>
            <Flex alignItems={'center'} mb={'8px'}>
              <Box fontSize={'14px'} fontWeight={500} color={'grayModern.900'} mr={'4px'}>
                {t('network_store_select_volume')}
              </Box>
              <MyTooltip label={t('network_store_select_volume_tip')}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <g clip-path="url(#clip0_4652_11607)">
                    <path
                      d="M5.30243 5.25013C5.43957 4.86027 5.71027 4.53152 6.06657 4.32212C6.42287 4.11272 6.84179 4.03618 7.24912 4.10604C7.65645 4.17591 8.02591 4.38768 8.29206 4.70385C8.55821 5.02002 8.70388 5.42018 8.70326 5.83346C8.70326 7.00013 6.95326 7.58346 6.95326 7.58346M7.00002 9.91675H7.00585M12.8334 7.00008C12.8334 10.2217 10.2217 12.8334 7.00002 12.8334C3.77836 12.8334 1.16669 10.2217 1.16669 7.00008C1.16669 3.77842 3.77836 1.16675 7.00002 1.16675C10.2217 1.16675 12.8334 3.77842 12.8334 7.00008Z"
                      stroke="#71717A"
                      strokeWidth="1.16375"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_4652_11607">
                      <rect width="14" height="14" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </MyTooltip>
            </Flex>
            <MySelect
              width={'100%'}
              height={'32px'}
              placeholder={t('please_select')}
              value={selectedPvc}
              list={selectList}
              onchange={(val: any) => setValue('pvcName', val)}
            />
            <Box mt={'8px'} fontSize={'14px'} color={'grayModern.900'} fontWeight={500}>
              {t('network_store_no_volume')}{' '}
              <Link
                color={'#2563EB'}
                textDecoration={'underline'}
                href={'#'}
                onClick={(e) => {
                  e.preventDefault();
                  sealosApp.runEvents('openDesktopApp', {
                    appKey: 'system-template',
                    pathname: '/deploy',
                    query: { templateName: 'share-storage' }
                  });
                }}
              >
                {t('network_store_go_app_store')}
              </Link>
            </Box>
          </Box>

          <MyFormControl showError errorText={errors.path?.message} pb={2}>
            <Box mb={'8px'} fontSize={'14px'} fontWeight={500} color={'grayModern.900'}>
              {t('mount path')}
            </Box>
            <Input
              width={'100%'}
              h={'32px'}
              fontSize={'12px'}
              bg={'grayModern.50'}
              borderColor={'grayModern.200'}
              placeholder={t('form.storage_path_placeholder')}
              {...register('path', {
                required: t('Storage path can not empty') || 'Storage path can not empty',
                pattern: {
                  value: /^[0-9a-zA-Z_/][0-9a-zA-Z_/.-]*[0-9a-zA-Z_/]$/,
                  message: t('Mount Path Auth')
                },
                validate: (e) => {
                  if (listNames.includes(e.toLocaleLowerCase())) {
                    return t('ConfigMap Path Conflict') || 'ConfigMap Path Conflict';
                  }
                  return true;
                }
              })}
            />
          </MyFormControl>

          <Flex justifyContent={'flex-end'} mt={'24px'}>
            <Button
              w={'88px'}
              h={'36px'}
              bg={'grayModern.900'}
              color={'white'}
              borderRadius={'6px'}
              fontSize={'14px'}
              fontWeight={500}
              _hover={{ bg: 'grayModern.700' }}
              onClick={handleSubmit((e) => {
                const pvc = pvcList.find((p) => p.name === e.pvcName);
                if (!pvc) return;

                successCb({
                  name: pvc.name,
                  path: e.path,
                  storageClassName: pvc.storageClassName
                });
              })}
            >
              {t('Add')}
            </Button>
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default NetworkStoreModal;
