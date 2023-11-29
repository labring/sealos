import CodeBlock from '@/components/CodeBlock';
import TagTextarea from '@/components/Textarea/TagTextarea';
import { CommandFormType } from '@/types';
import {
  Center,
  Divider,
  Flex,
  Input,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  TextProps,
  useDisclosure
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

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

  const { register, setValue, getValues, watch, reset } = useForm<CommandFormType>();

  const generateBashScript = ({
    data,
    basePath,
    cloudVersion
  }: { data: CommandFormType } & CommandFormProps) => {
    const masterIps = data?.masterIP?.join(',');
    const nodeIps = data?.nodeIP?.join(',');

    const commandParts = [
      basePath,
      cloudVersion ? ` --cloud-version=${cloudVersion} ` : '',
      ' --image-registry=registry.cn-shanghai.aliyuncs.com ',
      enterprise ? '' : ' --proxy-prefix=https://mirror.ghproxy.com ',
      masterIps ? ` --master-ips=${masterIps} ` : '',
      nodeIps ? ` --node-ips=${nodeIps} ` : '',
      data?.podSubnet ? ` --pod-cidr=${data?.podSubnet} ` : '',
      data?.serviceSubnet ? ` --service-cidr=${data?.serviceSubnet} ` : '',
      data?.cloudDomain ? ` --cloud-domain=${data?.cloudDomain} ` : '',
      data?.cloudPort ? ` --cloud-port=${data?.cloudPort} ` : '',
      data?.certPath ? ` --cert-patch=${data?.certPath} ` : '',
      data?.certKeyPath ? ` --key-patch=${data?.certKeyPath} ` : '',
      data?.sshPath ? ` --ssh-private-key=${data?.sshPath} ` : '',
      data?.sshPassword ? ` --ssh-password=${data?.sshPassword}` : ''
    ];

    const displayCommand = commandParts.filter(Boolean).join('\\\n');

    setCopyCommand(displayCommand);
    setDisplayCommand(displayCommand);
  };

  watch((data) => {
    const temp = generateBashScript({ data: data as CommandFormType, basePath, cloudVersion });
  });

  useEffect(() => {
    generateBashScript({
      data: {
        cloudVersion: '',
        imageRegistry: '',
        proxyPrefix: '',
        masterIP: [],
        nodeIP: [],
        sshPath: '',
        sshPassword: '',
        podSubnet: '',
        serviceSubnet: '',
        cloudDomain: '',
        cloudPort: '',
        certPath: '',
        certKeyPath: ''
      },
      basePath,
      cloudVersion
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Label = ({ children, textStyle }: { children: string; textStyle?: TextProps }) => {
    return (
      <Text w="110px" color={'myBlack.900'} fontSize={'14px'} fontWeight={400} {...textStyle}>
        {children}
      </Text>
    );
  };

  return (
    <>
      <Center
        borderRadius={'4px'}
        cursor={'pointer'}
        mt="20px"
        w="218px"
        h="44px"
        color={'#FFF'}
        bg="#24282C"
        fontSize={'14px'}
        fontWeight={600}
        onClick={onOpen}
      >
        生成安装命令
      </Center>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          reset();
          onClose();
        }}
        closeOnOverlayClick={false}
      >
        <ModalOverlay />
        <ModalContent minW={'575px'} maxH={'80%'}>
          <ModalHeader>生成安装命令</ModalHeader>
          <ModalCloseButton />
          <Flex
            overflowY={'scroll'}
            flexDirection={'column'}
            gap="16px"
            pt="20px"
            px="64px"
            pb="50px"
          >
            <Flex alignItems={'center'} justifyContent={'start'} gap={'40px'}>
              <Label
                textStyle={{
                  alignSelf: 'start'
                }}
              >
                Master 节点
              </Label>
              <TagTextarea
                inputStyle={{
                  placeholder: '回车保存, Master 节点只能为奇数',
                  color: '#24282C',
                  fontSize: '12px',
                  fontWeight: 400
                }}
                w={'320px'}
                h="80px"
                defaultValues={getValues('masterIP') || []}
                onUpdate={(e) => {
                  setValue('masterIP', e);
                }}
              />
            </Flex>
            <Flex alignItems={'center'} justifyContent={'start'} gap={'40px'}>
              <Label
                textStyle={{
                  alignSelf: 'start'
                }}
              >
                Node 节点
              </Label>
              <TagTextarea
                inputStyle={{
                  color: '#24282C',
                  fontSize: '12px',
                  fontWeight: 400
                }}
                h="80px"
                w={'320px'}
                defaultValues={getValues('nodeIP') || []}
                onUpdate={(e) => {
                  setValue('nodeIP', e);
                }}
              />
            </Flex>

            <Flex alignItems={'center'} justifyContent={'start'} gap={'40px'}>
              <Label>ssh 私钥路径</Label>
              <Input
                {...register('sshPath', {
                  required: true
                })}
              />
            </Flex>
            <Flex alignItems={'center'} justifyContent={'start'} gap={'40px'}>
              <Label>ssh 密码</Label>
              <Input
                placeholder="默认免密登录"
                {...register('sshPassword', {
                  required: true
                })}
              />
            </Flex>
            <Flex alignItems={'center'} justifyContent={'start'} gap={'40px'}>
              <Label>Pod 子网</Label>
              <Input
                {...register('podSubnet', {
                  required: true
                })}
              />
            </Flex>
            <Flex alignItems={'center'} justifyContent={'start'} gap={'40px'}>
              <Label>Service 子网</Label>
              <Input
                {...register('serviceSubnet', {
                  required: true
                })}
              />
            </Flex>
            <Flex alignItems={'center'} justifyContent={'start'} gap={'40px'}>
              <Label>Cloud 端口</Label>
              <Input
                {...register('cloudPort', {
                  required: true
                })}
              />
            </Flex>

            <Flex alignItems={'center'} justifyContent={'start'} gap={'40px'}>
              <Label>证书路径</Label>
              <Input
                placeholder={'默认使用 Sealos 提供的自签证书'}
                {...register('certPath', {
                  required: false
                })}
              />
            </Flex>

            <Flex alignItems={'center'} justifyContent={'start'} gap={'40px'}>
              <Label>证书 Key 路径</Label>
              <Input
                placeholder={'默认使用 Sealos 提供的自签证书'}
                {...register('certKeyPath', {
                  required: false
                })}
              />
            </Flex>

            <Divider mt="24px" />
            <Text
              textAlign={'center'}
              my="16px"
              color={'myBlack.900'}
              fontSize={'14px'}
              fontWeight={600}
            >
              安装命令
            </Text>
            <CodeBlock
              language="bash"
              copyCode={displayCommand}
              displayCode={displayCommand}
            ></CodeBlock>
          </Flex>
        </ModalContent>
      </Modal>
    </>
  );
}
