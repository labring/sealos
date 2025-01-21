import MyIcon from '@/components/Icon';
import { ProtocolList } from '@/constants/devbox';
import { useEnvStore } from '@/stores/env';
import { DevboxEditTypeV2 } from '@/types/devbox';
import { nanoid } from '@/utils/tools';
import {
  Box,
  BoxProps,
  Button,
  ButtonProps,
  Flex,
  IconButton,
  Input,
  Switch,
  useTheme
} from '@chakra-ui/react';
import { MySelect, useMessage } from '@sealos/ui';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import ConfigurationHeader from '../ConfigurationHeader';
// const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12)

export type CustomAccessModalParams = {
  publicDomain: string;
  customDomain: string;
};

const CustomAccessModal = dynamic(() => import('@/components/modals/CustomAccessModal'));
const AppendNetworksButton = (props: ButtonProps) => {
  const t = useTranslations();
  return (
    <Button
      w={'100px'}
      variant={'outline'}
      leftIcon={<MyIcon name="plus" w={'18px'} fill={'#485264'} />}
      {...props}
    >
      {t('Add Port')}
    </Button>
  );
};
export default function NetworkConfiguration({ isEdit, ...props }: BoxProps & { isEdit: boolean }) {
  const { register, getValues, control } = useFormContext<DevboxEditTypeV2>();
  const theme = useTheme();
  const [customAccessModalData, setCustomAccessModalData] = useState<CustomAccessModalParams>();
  const { env } = useEnvStore();
  const {
    fields: networks,
    update: updateNetworks,
    append: _appendNetworks,
    remove: removeNetworks
  } = useFieldArray({
    control,
    name: 'networks'
  });
  const t = useTranslations();
  const { message: toast } = useMessage();
  const appendNetworks = () => {
    _appendNetworks({
      networkName: '',
      portName: nanoid(),
      port: 8080,
      protocol: 'HTTP',
      openPublicDomain: false,
      publicDomain: '',
      customDomain: ''
    });
  };
  // const networks = watch('networks')
  return (
    <>
      <Box id={'baseInfo'} {...props}>
        <ConfigurationHeader>
          <MyIcon name={'network'} mr={'12px'} w={'24px'} color={'grayModern.900'} />
          {t('Network Configuration')}
        </ConfigurationHeader>
        <Box px={'42px'} py={'24px'} userSelect={'none'}>
          {networks.length === 0 && <AppendNetworksButton onClick={() => appendNetworks()} />}
          {networks.map((network, i) => (
            <Flex
              className="guide-network-configuration"
              alignItems={'flex-start'}
              key={network.id}
              _notLast={{ pb: 6, borderBottom: theme.borders.base }}
              _notFirst={{ pt: 6 }}
            >
              <Box>
                <Box mb={'10px'} h={'20px'} fontSize={'base'} color={'grayModern.900'}>
                  {t('Container Port')}
                </Box>
                <Input
                  h={'32px'}
                  type={'number'}
                  w={'110px'}
                  bg={'grayModern.50'}
                  {...register(`networks.${i}.port`, {
                    valueAsNumber: true,
                    min: {
                      value: 1,
                      message: t('The minimum exposed port is 1')
                    },
                    max: {
                      value: 65535,
                      message: t('The maximum number of exposed ports is 65535')
                    },
                    validate: {
                      repeatPort: (value) => {
                        const ports = getValues('networks').map((network, index) => ({
                          port: network.port,
                          index
                        }));
                        // 排除当前正在编辑的端口
                        const isDuplicate = ports.some(
                          (item) => item.port === value && item.index !== i
                        );
                        return !isDuplicate || t('The port number cannot be repeated');
                      }
                    }
                  })}
                />
                {i === networks.length - 1 && networks.length < 5 && (
                  <Box mt={3}>
                    <AppendNetworksButton onClick={() => appendNetworks()} />
                  </Box>
                )}
              </Box>
              <Box mx={7}>
                <Box mb={'8px'} h={'20px'} fontSize={'base'} color={'grayModern.900'}>
                  {t('Open Public Access')}
                </Box>
                <Flex alignItems={'center'} h={'35px'}>
                  <Switch
                    className="driver-deploy-network-switch"
                    size={'lg'}
                    id={`openPublicDomain-${i}`}
                    isChecked={!!network.openPublicDomain}
                    onChange={(e) => {
                      const devboxName = getValues('name');
                      if (!devboxName) {
                        toast({
                          title: t('Please enter the devbox name first'),
                          status: 'warning'
                        });
                        return;
                      }
                      updateNetworks(i, {
                        ...getValues('networks')[i],
                        networkName: network.networkName || `${devboxName}-${nanoid()}`,
                        protocol: network.protocol || 'HTTP',
                        openPublicDomain: e.target.checked,
                        publicDomain: network.publicDomain || `${nanoid()}.${env.ingressDomain}`
                      });
                    }}
                  />
                </Flex>
              </Box>
              {network.openPublicDomain && (
                <>
                  <Box flex={'1 0 0'}>
                    <Box mb={'8px'} h={'20px'}></Box>
                    <Flex alignItems={'center'} h={'35px'}>
                      <MySelect
                        width={'100px'}
                        height={'32px'}
                        borderTopRightRadius={0}
                        borderBottomRightRadius={0}
                        value={network.protocol}
                        // border={theme.borders.base}
                        list={ProtocolList}
                        onchange={(val: any) => {
                          updateNetworks(i, {
                            ...getValues('networks')[i],
                            protocol: val
                          });
                        }}
                      />
                      <Flex
                        maxW={'350px'}
                        flex={'1 0 0'}
                        alignItems={'center'}
                        h={'32px'}
                        bg={'grayModern.50'}
                        px={2}
                        border={theme.borders.base}
                        borderLeft={0}
                        borderTopRightRadius={'md'}
                        borderBottomRightRadius={'md'}
                      >
                        <Box flex={1} userSelect={'all'} className="textEllipsis">
                          {network.customDomain ? network.customDomain : network.publicDomain!}
                        </Box>
                        <Box
                          fontSize={'11px'}
                          color={'brightBlue.600'}
                          cursor={'pointer'}
                          whiteSpace={'nowrap'}
                          onClick={() =>
                            setCustomAccessModalData({
                              publicDomain: network.publicDomain!,
                              customDomain: network.customDomain!
                            })
                          }
                        >
                          {t('Custom Domain')}
                        </Box>
                      </Flex>
                    </Flex>
                  </Box>
                </>
              )}
              {networks.length >= 1 && (
                <Box ml={3}>
                  <Box mb={'8px'} h={'20px'}></Box>
                  <IconButton
                    height={'32px'}
                    width={'32px'}
                    aria-label={'button'}
                    variant={'outline'}
                    bg={'#FFF'}
                    _hover={{
                      color: 'red.600',
                      bg: 'rgba(17, 24, 36, 0.05)'
                    }}
                    icon={<MyIcon name={'delete'} w={'16px'} fill={'#485264'} />}
                    onClick={() => removeNetworks(i)}
                  />
                </Box>
              )}
            </Flex>
          ))}
        </Box>
      </Box>
      {!!customAccessModalData && (
        <CustomAccessModal
          {...customAccessModalData}
          onClose={() => setCustomAccessModalData(undefined)}
          onSuccess={(e) => {
            const i = networks.findIndex(
              (item) => item.publicDomain === customAccessModalData.publicDomain
            );
            if (i === -1) return;
            updateNetworks(i, {
              ...networks[i],
              customDomain: e
            });
            setCustomAccessModalData(undefined);
          }}
        />
      )}
    </>
  );
}
