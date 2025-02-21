import { useMessage } from '@sealos/ui';
import { useTranslations } from 'next-intl';
import React, { useCallback, useState } from 'react';
import { Box, Text, Flex, Image, Spinner, Tooltip, Button } from '@chakra-ui/react';

import { useEnvStore } from '@/stores/env';
import { usePriceStore } from '@/stores/price';
import { useDevboxStore } from '@/stores/devbox';
import { getTemplateConfig } from '@/api/template';
import { getSSHConnectionInfo } from '@/api/devbox';
import { downLoadBlob, parseTemplateConfig } from '@/utils/tools';

import MyIcon from '@/components/Icon';
import GPUItem from '@/components/GPUItem';
import { JetBrainsGuideData } from '@/components/IDEButton';
import SshConnectModal from '@/components/modals/SshConnectModal';

const BasicInfo = () => {
  const t = useTranslations();
  const { message: toast } = useMessage();

  const { env } = useEnvStore();
  const { devboxDetail } = useDevboxStore();
  const { sourcePrice, setSourcePrice } = usePriceStore();

  const [loading, setLoading] = useState(false);
  const [onOpenSsHConnect, setOnOpenSsHConnect] = useState(false);
  const [sshConfigData, setSshConfigData] = useState<JetBrainsGuideData | null>(null);

  const handleOneClickConfig = useCallback(async () => {
    const { base64PrivateKey, userName, token } = await getSSHConnectionInfo({
      devboxName: devboxDetail?.name as string
    });

    const result = await getTemplateConfig(devboxDetail?.templateUid as string);
    const config = parseTemplateConfig(result.template.config);
    console.log('config', config);

    const sshPrivateKey = Buffer.from(base64PrivateKey, 'base64').toString('utf-8');

    if (!devboxDetail?.sshPort) return;

    setSshConfigData({
      devboxName: devboxDetail?.name,
      runtimeType: devboxDetail?.templateRepositoryName,
      privateKey: sshPrivateKey,
      userName,
      token,
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
    env.namespace
  ]);

  const handleCopySSHCommand = useCallback(() => {
    const sshCommand = `ssh -i yourPrivateKeyPath ${devboxDetail?.sshConfig?.sshUser}@${env.sealosDomain} -p ${devboxDetail?.sshPort}`;
    navigator.clipboard.writeText(sshCommand).then(() => {
      toast({
        title: t('copy_success'),
        status: 'success',
        duration: 2000,
        isClosable: true
      });
    });
  }, [devboxDetail?.sshConfig?.sshUser, devboxDetail?.sshPort, env.sealosDomain, toast, t]);

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
              {
                // getRuntimeDetailLabel(devboxDetail?., devboxDetail?.runtimeVersion)
                `${devboxDetail?.templateRepositoryName}-${devboxDetail?.templateName}`
              }
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
                cursor="pointer"
                fontSize={'12px'}
                _hover={{ color: 'blue.500' }}
                onClick={handleCopySSHCommand}
                w={'full'}
              >
                {`ssh -i yourPrivateKeyPath ${devboxDetail?.sshConfig?.sshUser}@${env.sealosDomain} -p ${devboxDetail?.sshPort}`}
              </Text>
            </Tooltip>
          </Flex>
        </Flex>
        <Flex>
          <Text mr={2} width={'40%'} fontSize={'12px'}>
            {t('private_key')}
          </Text>
          <Flex width={'60%'} color={'grayModern.600'}>
            {loading ? (
              <Spinner size="sm" color="#0077A9" />
            ) : (
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
                        `${devboxDetail?.name}`
                      )
                    }
                  />
                </Flex>
              </Tooltip>
            )}
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
