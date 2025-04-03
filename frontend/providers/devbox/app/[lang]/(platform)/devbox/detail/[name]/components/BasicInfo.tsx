import { useTranslations } from 'next-intl';
import React, { useCallback, useMemo, useState } from 'react';
import { Box, Text, Flex, Image, Tooltip, Button } from '@chakra-ui/react';

import { useEnvStore } from '@/stores/env';
import { usePriceStore } from '@/stores/price';
import { useDevboxStore } from '@/stores/devbox';
import { getTemplateConfig } from '@/api/template';
import { downLoadBlob, parseTemplateConfig, useCopyData } from '@/utils/tools';

import MyIcon from '@/components/Icon';
import GPUItem from '@/components/GPUItem';
import { JetBrainsGuideData } from '@/components/IDEButton';
import SshConnectModal from '@/components/modals/SshConnectModal';

const BasicInfo = () => {
  const t = useTranslations();
  const { copyData } = useCopyData();

  const { env } = useEnvStore();
  const { sourcePrice } = usePriceStore();
  const { devboxDetail } = useDevboxStore();

  const [onOpenSsHConnect, setOnOpenSsHConnect] = useState(false);
  const [sshConfigData, setSshConfigData] = useState<JetBrainsGuideData | null>(null);

  const handleOneClickConfig = useCallback(async () => {
    const result = await getTemplateConfig(devboxDetail?.templateUid as string);
    const config = parseTemplateConfig(result.template.config);

    if (!devboxDetail?.sshPort) return;

    setSshConfigData({
      devboxName: devboxDetail?.name,
      runtimeType: devboxDetail?.templateRepositoryName,
      privateKey: devboxDetail?.sshConfig?.sshPrivateKey as string,
      userName: devboxDetail?.sshConfig?.sshUser as string,
      token: devboxDetail?.sshConfig?.token as string,
      workingDir: config.workingDir,
      host: env.sealosDomain,
      port: devboxDetail?.sshPort.toString(),
      configHost: `${env.sealosDomain}_${env.namespace}_${devboxDetail?.name}`
    });

    setOnOpenSsHConnect(true);
  }, [
    devboxDetail?.name,
    devboxDetail?.templateUid,
    devboxDetail?.sshPort,
    devboxDetail?.templateRepositoryName,
    env.sealosDomain,
    env.namespace,
    devboxDetail?.sshConfig?.sshUser,
    devboxDetail?.sshConfig?.sshPrivateKey,
    devboxDetail?.sshConfig?.token
  ]);

  const sshConnectCommand = useMemo(
    () =>
      `ssh -i ${env.sealosDomain}_${env.namespace}_${devboxDetail?.name} ${devboxDetail?.sshConfig?.sshUser}@${env.sealosDomain} -p ${devboxDetail?.sshPort}`,
    [
      devboxDetail?.name,
      devboxDetail?.sshConfig?.sshUser,
      devboxDetail?.sshPort,
      env.sealosDomain,
      env.namespace
    ]
  );

  return (
    <Flex borderRadius="lg" bg={'white'} p={4} flexDirection={'column'} h={'100%'}>
      {/* basic info */}
      <Flex mb={3} mt={2}>
        <MyIcon name="info" w={'15px'} h={'15px'} mr={'4px'} color={'grayModern.600'} mt={'1px'} />
        <Box color={'grayModern.600'} fontSize={'base'} fontWeight={'bold'}>
          {t('basic_info')}
        </Box>
      </Flex>
      <Flex bg={'grayModern.50'} p={4} borderRadius={'lg'} gap={4} flexDirection={'column'}>
        <Flex>
          <Text mr={2} width={'40%'} fontSize={'12px'}>
            {t('name')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Text fontSize={'12px'}>{devboxDetail?.name}</Text>
            <Image
              ml={2}
              width={'20px'}
              height={'20px'}
              onError={(e) => {
                e.currentTarget.src = '/images/custom.svg';
              }}
              alt={devboxDetail?.iconId}
              src={`/images/${devboxDetail?.iconId}.svg`}
            />
          </Flex>
        </Flex>
        <Flex>
          <Text mr={2} width={'40%'} fontSize={'12px'}>
            {t('image_info')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Text
              fontSize={'12px'}
              w={'full'}
            >{`${env.registryAddr}/${env.namespace}/${devboxDetail?.name}`}</Text>
          </Flex>
        </Flex>
        <Flex>
          <Text mr={2} width={'40%'} fontSize={'12px'}>
            {t('create_time')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Text fontSize={'12px'}>{devboxDetail?.createTime}</Text>
          </Flex>
        </Flex>
        <Flex>
          <Text mr={2} width={'40%'} fontSize={'12px'}>
            {t('start_runtime')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Text fontSize={'12px'} w={'full'} textOverflow={'ellipsis'}>
              {`${devboxDetail?.templateRepositoryName}-${devboxDetail?.templateName}`}
            </Text>
          </Flex>
        </Flex>
        <Flex>
          <Text mr={2} width={'40%'} fontSize={'12px'}>
            {t('start_time')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Text fontSize={'12px'}>{devboxDetail?.upTime}</Text>
          </Flex>
        </Flex>
        <Flex>
          <Text mr={2} width={'40%'} fontSize={'12px'}>
            CPU Limit
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Text fontSize={'12px'}>{(devboxDetail?.cpu || 0) / 1000} Core</Text>
          </Flex>
        </Flex>
        <Flex>
          <Text mr={2} width={'40%'} fontSize={'12px'}>
            Memory Limit
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Text fontSize={'12px'}>{(devboxDetail?.memory || 0) / 1024} G</Text>
          </Flex>
        </Flex>
        {sourcePrice?.gpu && (
          <Flex>
            <Text mr={2} width={'40%'} fontSize={'12px'}>
              GPU
            </Text>
            <Flex width={'60%'} color={'grayModern.600'}>
              <GPUItem gpu={devboxDetail?.gpu} />
            </Flex>
          </Flex>
        )}
      </Flex>
      {/* ssh config */}
      <Flex mb={3} mt={4} alignItems={'center'} justify={'space-between'}>
        <Flex>
          <MyIcon
            name="link"
            w={'15px'}
            h={'15px'}
            mr={'4px'}
            color={'grayModern.600'}
            mt={'1px'}
            ml={'1px'}
          />
          <Box color={'grayModern.600'} fontSize={'base'} fontWeight={'bold'}>
            {t('ssh_config')}
          </Box>
        </Flex>
        <Button
          size={'sm'}
          leftIcon={<MyIcon name="settings" w={'16px'} />}
          bg={'white'}
          isDisabled={devboxDetail?.status.value !== 'Running'}
          color={'grayModern.600'}
          border={'1px solid'}
          borderColor={'grayModern.200'}
          _hover={{
            color: 'brightBlue.600'
          }}
          onClick={() => handleOneClickConfig()}
        >
          {t('one_click_config')}
        </Button>
      </Flex>
      <Flex bg={'grayModern.50'} p={4} borderRadius={'lg'} gap={4} flexDirection={'column'}>
        <Flex>
          <Text mr={2} width={'40%'} fontSize={'12px'}>
            {t('ssh_connect_info')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Tooltip
              label={t('copy')}
              isDisabled={devboxDetail?.status.value !== 'Running'}
              hasArrow
              bg={'#FFFFFF'}
              color={'grayModern.900'}
              width={'45px'}
              height={'30px'}
              fontSize={'12px'}
              fontWeight={400}
              py={2}
              borderRadius={'md'}
            >
              <Text
                fontSize={'12px'}
                {...(devboxDetail?.status.value === 'Running' && {
                  cursor: 'pointer',
                  _hover: { color: 'blue.500' },
                  onClick: () => copyData(sshConnectCommand)
                })}
                w={'full'}
              >
                {devboxDetail?.status.value === 'Running' ? (
                  sshConnectCommand
                ) : (
                  <span style={{ marginLeft: '8px' }}>-</span>
                )}
              </Text>
            </Tooltip>
          </Flex>
        </Flex>
        <Flex>
          <Text mr={2} width={'40%'} fontSize={'12px'}>
            {t('private_key')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            <Tooltip
              label={t('export_privateKey')}
              hasArrow
              bg={'#FFFFFF'}
              color={'grayModern.900'}
              fontSize={'12px'}
              fontWeight={400}
              py={2}
              borderRadius={'md'}
            >
              <Flex
                p={1}
                borderRadius={'6px'}
                _hover={{
                  bg: 'rgba(17, 24, 36, 0.05)'
                }}
              >
                <MyIcon
                  cursor={'pointer'}
                  name="download"
                  color={'grayModern.600'}
                  w={'16px'}
                  h={'16px'}
                  onClick={() =>
                    downLoadBlob(
                      devboxDetail?.sshConfig?.sshPrivateKey as string,
                      'application/octet-stream',
                      `${env.sealosDomain}_${env.namespace}_${devboxDetail?.name}`
                    )
                  }
                />
              </Flex>
            </Tooltip>
          </Flex>
        </Flex>
      </Flex>
      {/* event */}
      <Flex mb={3} mt={4}>
        <MyIcon
          name="response"
          w={'15px'}
          h={'15px'}
          mr={'4px'}
          color={'grayModern.600'}
          mt={'2px'}
        />
        <Box color={'grayModern.600'} fontSize={'base'} fontWeight={'bold'}>
          {t('event')}
        </Box>
      </Flex>
      <Flex bg={'grayModern.50'} p={4} borderRadius={'lg'} gap={4} flexDirection={'column'}>
        <Flex>
          <Text mr={2} width={'40%'} fontSize={'12px'}>
            {t('recent_error')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'} alignItems={'center'}>
            {devboxDetail?.lastTerminatedReason ? (
              <Text fontSize={'12px'} color={'red'}>
                {devboxDetail?.lastTerminatedReason}
              </Text>
            ) : (
              <Text fontSize={'12px'}>{t('none')}</Text>
            )}
            <Tooltip
              label={t('read_event_detail')}
              hasArrow
              bg={'#FFFFFF'}
              color={'grayModern.900'}
              width={'120px'}
              height={'30px'}
              fontSize={'12px'}
              fontWeight={400}
              py={2}
              borderRadius={'md'}
            >
              <Flex
                ml={3}
                p={1}
                borderRadius={'6px'}
                _hover={{
                  bg: 'rgba(17, 24, 36, 0.05)'
                }}
              >
                <MyIcon
                  cursor={'pointer'}
                  name="maximize"
                  w={'16px'}
                  h={'16px'}
                  color={'grayModern.600'}
                  mt={'1px'}
                />
              </Flex>
            </Tooltip>
          </Flex>
        </Flex>
      </Flex>
      {onOpenSsHConnect && sshConfigData && (
        <SshConnectModal
          jetbrainsGuideData={sshConfigData}
          onSuccess={() => {
            setOnOpenSsHConnect(false);
          }}
          onClose={() => {
            setOnOpenSsHConnect(false);
          }}
        />
      )}
    </Flex>
  );
};

export default BasicInfo;
