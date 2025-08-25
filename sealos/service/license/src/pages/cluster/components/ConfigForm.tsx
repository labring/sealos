import CodeBlock from '@/components/CodeBlock';
import { AddIcon, CodeIcon, ReduceIcon } from '@/components/Icon';
import { InfoIcon } from '@/components/Icon/InfoIcon';
import Tabs from '@/components/Tabs';
import { CommandFormType } from '@/types';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Divider,
  Flex,
  FlexProps,
  Input,
  Switch,
  Tag,
  TagLabel,
  TagLeftIcon,
  Text,
  TextProps,
  useDisclosure
} from '@chakra-ui/react';
import { debounce } from 'lodash';
import { useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

type CommandFormProps = {
  basePath: string;
  cloudVersion: string;
  enterprise?: boolean;
};

export default function CommandForm({
  basePath,
  cloudVersion,
  enterprise = false
}: CommandFormProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [displayCommand, setDisplayCommand] = useState('');
  const [copyCommand, setCopyCommand] = useState('');
  const [forceUpdate, setForceUpdate] = useState(false);

  const { register, setValue, getValues, watch, reset, control } = useForm<CommandFormType>({
    defaultValues: {
      masterIP: [
        {
          ip: ''
        }
      ],
      nodeIP: [
        {
          ip: ''
        }
      ],
      ssh: {
        useKey: true,
        path: '/root/.ssh/id_rsa',
        password: ''
      },
      k8sVersion: '1.27.11',
      podSubnet: '100.64.0.0/10',
      serviceSubnet: '10.96.0.0/22',
      selfSigned: true,
      cloudPort: '443',
      useImageRegistry: true,
      imageRegistry: 'registry.cn-shanghai.aliyuncs.com',
      useProxyPrefix: true,
      proxyPrefix: 'https://mirror.ghproxy.com'
    }
  });
  const {
    fields: masterIP,
    append: appendMasterIP,
    remove: removeMasterIP,
    update: updateMasterIP
  } = useFieldArray({
    control,
    name: 'masterIP'
  });
  const {
    fields: nodeIP,
    append: appendNodeIP,
    remove: removeNodeIP,
    update: updateNodeIP
  } = useFieldArray({
    control,
    name: 'nodeIP'
  });

  watch((data) => {
    if (!data) return;
    formOnchangeDebounce(data as CommandFormType);
    setForceUpdate(!forceUpdate);
  });

  const formOnchangeDebounce = useMemo(
    () =>
      debounce((data: CommandFormType) => {
        try {
          generateBashScript({ data, basePath, cloudVersion, enterprise });
        } catch (error) {
          console.log(error);
        }
      }, 200),
    [basePath, cloudVersion, enterprise]
  );

  const generateBashScript = ({
    data,
    basePath,
    cloudVersion,
    enterprise
  }: { data: CommandFormType } & CommandFormProps) => {
    const masterIps = data?.masterIP.map((i) => i.ip)?.join(',');
    const nodeIps = data?.nodeIP.map((i) => i.ip)?.join(',');
    const commandParts = [
      basePath,
      cloudVersion ? ` --cloud-version=${cloudVersion} ` : '',
      data.useImageRegistry && !enterprise ? ` --image-registry=${data.imageRegistry} ` : '',
      data.useProxyPrefix && !enterprise ? ` --proxy-prefix=${data.proxyPrefix} ` : '',
      masterIps ? ` --master-ips=${masterIps} ` : '',
      nodeIps ? ` --node-ips=${nodeIps} ` : '',
      data?.podSubnet ? ` --pod-cidr=${data?.podSubnet} ` : '',
      data?.serviceSubnet ? ` --service-cidr=${data?.serviceSubnet} ` : '',
      data?.cloudDomain ? ` --cloud-domain=${data?.cloudDomain} ` : '',
      data?.cloudPort ? ` --cloud-port=${data?.cloudPort} ` : '',
      data?.certPath ? ` --cert-path=${data?.certPath} ` : '',
      data?.certKeyPath ? ` --key-path=${data?.certKeyPath} ` : '',
      data?.ssh.useKey
        ? ` --ssh-private-key=${data?.ssh.path} `
        : ` --ssh-password=${data?.ssh.password} `,
      data?.k8sVersion ? ` --kubernetes-version=${data.k8sVersion} ` : ''
    ];
    const displayCommand = commandParts.filter(Boolean).join('\\\n');
    setCopyCommand(displayCommand);
    setDisplayCommand(displayCommand);
  };

  const Label = ({ children, textStyle }: { children: string; textStyle?: TextProps }) => {
    return (
      <Text w="147px" color={'#24282C'} fontSize={'14px'} fontWeight={500} {...textStyle}>
        {children}
      </Text>
    );
  };

  const baseTitleStyle: FlexProps = {
    w: '100%',
    h: 10,
    px: 8,
    fontSize: 'md',
    fontWeight: 500,
    bg: 'gray.50',
    color: 'gray.900',
    alignItems: 'center',
    borderRadius: 'lg'
  };

  return (
    <>
      <Flex alignItems={'center'} py="6px">
        <CodeIcon w="18px" h="18px" />
        <Text ml="12px" fontSize={'16px'} fontWeight={600}>
          生成安装命令
        </Text>
      </Flex>
      {/* base */}
      <Box mt="12px">
        <Flex {...baseTitleStyle}>基础配置</Flex>
        <Box p={8} pr="4">
          <Flex alignItems={'center'}>
            <Label
              textStyle={{
                alignSelf: 'start'
              }}
            >
              多 Master 节点
            </Label>
            <Flex flexDirection={'column'} gap={'12px'}>
              {masterIP.map((item, i) => (
                <Flex key={item.id} gap={'12px'}>
                  <Input
                    placeholder="Master IP，例：192.168.0.1"
                    {...register(`masterIP.${i}.ip`, {
                      required: true
                    })}
                  />
                  {masterIP.length > 1 && (
                    <Button variant={'square'} onClick={() => removeMasterIP(i)}>
                      <ReduceIcon />
                    </Button>
                  )}
                  {i === masterIP.length - 1 && (
                    <Button variant={'square'} onClick={() => appendMasterIP({ ip: '' })}>
                      <AddIcon />
                    </Button>
                  )}
                </Flex>
              ))}
              <Tag bg="#F0FBFF" color={'#0884DD'} height={'32px'} width={'164px'}>
                <TagLeftIcon boxSize="12px" as={InfoIcon} />
                <TagLabel>Master 节点需为奇数</TagLabel>
              </Tag>
            </Flex>
          </Flex>
          <Flex alignItems={'center'} mt="8">
            <Label
              textStyle={{
                alignSelf: 'start'
              }}
            >
              多 Node 节点
            </Label>
            <Flex flexDirection={'column'} gap={'12px'}>
              {nodeIP.map((item, i) => (
                <Flex key={item.id} gap={'12px'}>
                  <Input
                    placeholder="Master IP，例：192.168.0.1"
                    {...register(`nodeIP.${i}.ip`, {
                      required: true
                    })}
                  />
                  {nodeIP.length > 1 && (
                    <Button variant={'square'} onClick={() => removeNodeIP(i)}>
                      <ReduceIcon />
                    </Button>
                  )}
                  {i === nodeIP.length - 1 && (
                    <Button variant={'square'} onClick={() => appendNodeIP({ ip: '' })}>
                      <AddIcon />
                    </Button>
                  )}
                </Flex>
              ))}
            </Flex>
          </Flex>
          <Flex alignItems={'center'} mt="8">
            <Label
              textStyle={{
                alignSelf: 'self-start'
              }}
            >
              ssh 配置
            </Label>
            <Flex flexDirection={'column'}>
              <Tabs
                w={'142px'}
                size={'sm'}
                list={[
                  {
                    label: 'ssh 免密',
                    id: `passwordFree`
                  },
                  {
                    label: 'ssh 密码',
                    id: `password`
                  }
                ]}
                activeId={getValues('ssh.useKey') ? 'passwordFree' : 'password'}
                onChange={(val) => {
                  console.log(val, getValues('ssh.useKey'));
                  if (val === 'password') {
                    setValue('ssh.useKey', false);
                  } else {
                    setValue('ssh.useKey', true);
                  }
                }}
              />
              {getValues('ssh.useKey') ? (
                <>
                  <Text mt="4" color={'gray.900'} fontSize={'xs'} fontWeight={'normal'}>
                    私钥路径
                  </Text>
                  <Input
                    value={getValues('ssh.path')}
                    mt="1"
                    {...register('ssh.path', {
                      required: true
                    })}
                  />
                </>
              ) : (
                <>
                  <Text mt="4" color={'gray.900'} fontSize={'xs'} fontWeight={'normal'}>
                    密码
                  </Text>
                  <Input
                    autoComplete="new-password"
                    type="password"
                    value={getValues('ssh.password')}
                    mt="1"
                    {...register('ssh.password', {
                      required: true
                    })}
                  />
                </>
              )}
            </Flex>
          </Flex>
        </Box>
      </Box>
      {/* Kubernetes */}
      <Box mt="12px">
        <Flex {...baseTitleStyle}>Kubernetes 配置</Flex>
        <Box p={8} pr="4">
          <Flex alignItems={'center'}>
            <Label>Kubernetes 版本</Label>
            <Input
              {...register('k8sVersion', {
                required: true
              })}
            />
          </Flex>
          <Flex alignItems={'center'} mt="8">
            <Label>Pod cidr</Label>
            <Input
              {...register('podSubnet', {
                required: true
              })}
            />
          </Flex>
          <Flex alignItems={'center'} mt="8">
            <Label>Service cidr</Label>
            <Input
              {...register('serviceSubnet', {
                required: true
              })}
            />
          </Flex>
        </Box>
      </Box>

      <Box mt="12px">
        <Flex {...baseTitleStyle}>域名及证书配置</Flex>
        <Box p={8} pr="4">
          <Flex alignItems={'center'}>
            <Label
              textStyle={{
                alignSelf: 'self-start'
              }}
            >
              域名
            </Label>
            <Flex flexDirection={'column'}>
              <Text color={'gray.900'} fontSize={'xs'} fontWeight={'normal'}>
                域名
              </Text>
              <Input
                mt="1"
                {...register('cloudDomain', {
                  required: true
                })}
              />
              <Text mt="4" color={'gray.900'} fontSize={'xs'} fontWeight={'normal'}>
                端口
              </Text>
              <Input
                mt="1"
                {...register('cloudPort', {
                  required: true
                })}
              />
            </Flex>
          </Flex>
          <Flex alignItems={'center'} mt="8">
            <Label
              textStyle={{
                alignSelf: 'self-start'
              }}
            >
              证书
            </Label>
            <Flex flexDirection={'column'}>
              <Tabs
                w={'142px'}
                size={'sm'}
                list={[
                  {
                    label: '自签证书',
                    id: `self`
                  },
                  {
                    label: '使用证书',
                    id: `usecert`
                  }
                ]}
                activeId={getValues('selfSigned') ? 'self' : 'usecert'}
                onChange={(val) => {
                  console.log(val, getValues('ssh.useKey'));
                  if (val === 'usecert') {
                    setValue('selfSigned', false);
                  } else {
                    setValue('selfSigned', true);
                  }
                }}
              />
              {!getValues('selfSigned') && (
                <>
                  <Text mt="4" color={'gray.900'} fontSize={'xs'} fontWeight={'normal'}>
                    证书绝对路径
                  </Text>
                  <Input
                    mt="1"
                    placeholder="证书绝对路径"
                    {...register('certPath', {
                      required: true
                    })}
                  />
                  <Text mt="4" color={'gray.900'} fontSize={'xs'} fontWeight={'normal'}>
                    私钥绝对路径
                  </Text>
                  <Input
                    mt="1"
                    placeholder="私钥绝对路径"
                    {...register('certKeyPath', {
                      required: true
                    })}
                  />
                </>
              )}
            </Flex>
          </Flex>
        </Box>
      </Box>
      {!enterprise && (
        <Accordion allowToggle>
          <AccordionItem border={'none'} borderRadius={'12px'}>
            <AccordionButton pl="32px" pr="26px" bg="#F7F8FA" borderRadius={'8px'}>
              <Text fontSize={'md'} fontWeight={500}>
                高级配置
              </Text>
              <AccordionIcon ml="auto" w="24px" h="24px" />
            </AccordionButton>
            <AccordionPanel p={8} pr="4">
              <Flex alignItems={'center'}>
                <Label
                  textStyle={{
                    alignSelf: 'self-start'
                  }}
                >
                  使用代理镜像仓库
                </Label>
                <Flex flexDirection={'column'}>
                  <Box>
                    <Switch
                      size={'md'}
                      isChecked={getValues('useImageRegistry')}
                      onChange={(e) => {
                        setValue('useImageRegistry', e.target.checked);
                      }}
                    />
                  </Box>
                  {getValues('useImageRegistry') && (
                    <>
                      <Text mt="4" color={'gray.900'} fontSize={'xs'} fontWeight={'normal'}>
                        地址
                      </Text>
                      <Input
                        w="360px"
                        mt="1"
                        {...register('imageRegistry', {
                          required: true
                        })}
                      />
                    </>
                  )}
                </Flex>
              </Flex>
              <Flex alignItems={'center'} mt="8">
                <Label
                  textStyle={{
                    alignSelf: 'self-start'
                  }}
                >
                  使用代理下载地址
                </Label>
                <Flex flexDirection={'column'}>
                  <Box>
                    <Switch
                      size={'md'}
                      colorScheme={'blackAlpha'}
                      isChecked={getValues('useProxyPrefix')}
                      onChange={(e) => {
                        setValue('useProxyPrefix', e.target.checked);
                      }}
                    />
                  </Box>
                  {getValues('useProxyPrefix') && (
                    <>
                      <Text mt="4" color={'gray.900'} fontSize={'xs'} fontWeight={'normal'}>
                        地址
                      </Text>
                      <Input
                        w="360px"
                        mt="1"
                        {...register('proxyPrefix', {
                          required: true
                        })}
                      />
                    </>
                  )}
                </Flex>
              </Flex>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      )}
      <Divider mt="12px" />
      <Text my="12px" color={'gray.900'} fontSize={'14px'} fontWeight={600}>
        安装命令
      </Text>
      <CodeBlock language="bash" copyCode={displayCommand} displayCode={displayCommand}></CodeBlock>
    </>
  );
}
