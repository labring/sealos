import { ListCheckIcon, MySelect } from '@sealos/ui';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import {
  Box,
  Heading,
  Text,
  Button,
  Stack,
  FormControl,
  FormLabel,
  Input,
  Flex,
  useColorModeValue,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  Img,
  Icon,
  Portal
} from '@chakra-ui/react';
// import { ClawCloudIcon } from '../icons';
import { useMemo, useState } from 'react';
import { Region } from '@/types';
import { Mutation, useMutation, useQuery } from '@tanstack/react-query';
import { regionList as getRegionList, initRegionToken } from '@/api/auth';
import { sessionConfig } from '@/utils/sessionConfig';
import { useRouter } from 'next/router';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useConfigStore } from '@/stores/config';
import useSessionStore from '@/stores/session';
import { useInitWorkspaceStore } from '@/stores/initWorkspace';
import { SwitchRegionType } from '@/constants/account';
import { I18nCloudProvidersKey } from '@/types/i18next';
import { CheckIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { useGuideModalStore } from '@/stores/guideModal';

export default function Workspace() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useCustomToast();
  const bg = useColorModeValue('white', 'gray.700');
  const provider = useSessionStore((s) => s.lastSigninProvier);
  const { workspaceName, setWorkspaceName, setSelectedRegionUid, selectedRegionUid } =
    useInitWorkspaceStore();
  const [workspaceNameFieldDirty, setWorkspaceNameFieldDirty] = useState(false);
  const { setInitGuide } = useGuideModalStore();
  const { cloudConfig } = useConfigStore();
  const { token } = useSessionStore();
  const regionListQuery = useQuery({
    queryKey: ['regionList'],
    queryFn: getRegionList
  });
  const regionList = useMemo(
    () => regionListQuery.data?.data?.regionList || [],
    [regionListQuery.data?.data?.regionList]
  );
  const selectedRegion = useMemo(() => {
    if (regionList.length === 0) return null;
    if (!selectedRegionUid) return regionList[0];
    return regionList.find((r) => r.uid === selectedRegionUid) || null;
  }, [regionList, selectedRegionUid]);
  const mutation = useMutation({
    mutationFn(data: { regionUid: string; workspaceName: string }) {
      return initRegionToken(data);
    },
    onSuccess: (data) => {
      setInitGuide(true);
    }
  });
  const handleStartDeploying = async () => {
    try {
      if (!selectedRegion || !workspaceName || mutation.isLoading) {
        toast({
          status: 'error',
          title: t('v2:please_select_region_and_workspace_name')
        });
        return;
      }
      if (selectedRegion.uid !== cloudConfig?.regionUID) {
        const target = new URL(`https://${selectedRegion.domain}/switchRegion`);
        if (!token) throw Error('No token found');
        target.searchParams.append('token', token);
        target.searchParams.append('workspaceName', encodeURIComponent(workspaceName));
        // target.searchParams.append('regionUid', encodeURIComponent(region.uid));
        target.searchParams.append('switchRegionType', SwitchRegionType.INIT);
        await router.replace(target);
        return;
      }
      const initRegionTokenResult = await mutation.mutateAsync({
        regionUid: selectedRegion.uid,
        workspaceName: workspaceName
      });
      if (!initRegionTokenResult.data) {
        throw new Error('No result data');
      }
      await sessionConfig(initRegionTokenResult.data);
      await router.replace('/');
    } catch (error) {
      console.error(error);
      toast({
        status: 'error',
        //@ts-ignore
        title: t('v2:workspace_deploy_failed')
      });
    }
  };

  return (
    <Flex minH="100vh" align="center" justify="center" bg={bg} direction={'column'}>
      <Stack spacing={8} mx="auto" maxW="lg" px={4} h={'60%'}>
        <Box rounded="lg" p={8} display={'flex'} flexDirection={'column'} width={'min-content'}>
          <Heading mb={4} fontSize={'24px'} alignSelf={'center'}>
            {t('v2:workspace_create')}
          </Heading>
          <Text
            fontWeight={400}
            fontSize="14px"
            lineHeight="20px"
            textAlign="center"
            color="#71717A"
            alignSelf={'center'}
            mb={6}
          >
            {t('v2:worspace_heading_description')}
          </Text>
          <Stack spacing={'8px'} width={'352px'}>
            <FormControl>
              <FormLabel>{t('v2:choose_a_region')}</FormLabel>
              <Popover>
                {({ isOpen, onClose }) => (
                  <>
                    <PopoverTrigger>
                      <Flex
                        cursor={'pointer'}
                        width={'full'}
                        height="40px"
                        borderRadius="8px"
                        borderWidth="1px"
                        p={'10px 16px'}
                        gap="4px"
                        alignItems={'center'}
                        tabIndex={0}
                      >
                        <Text color={'#18181B'} fontSize={'16px'}>
                          {selectedRegion?.displayName}
                        </Text>
                        <Box mx={'12px'} border={'1px solid #E4E4E7'} h={'16px'}></Box>
                        {selectedRegion?.description.provider &&
                          [
                            'volcano_engine',
                            'alibaba_cloud',
                            'tencent_cloud',
                            'google_cloud'
                          ].includes(selectedRegion?.description.provider) && (
                            <Img
                              src={`/images/cloud_providers/${selectedRegion?.description.provider}.svg`}
                            ></Img>
                          )}
                        <Text fontSize={'12px'} color={'#3F3F46'}>
                          {t(selectedRegion?.description?.provider as I18nCloudProvidersKey, {
                            ns: 'cloudProviders'
                          })}
                        </Text>
                        <ChevronDownIcon ml="auto" boxSize={'16px'} />
                      </Flex>
                    </PopoverTrigger>
                    <Portal>
                      <PopoverContent
                        bg="white"
                        width={'352px'}
                        border="0.5px solid #E4E4E7"
                        boxShadow="0px 8px 24px -10px rgba(0, 0, 0, 0.2)"
                        borderRadius="12px"
                        outline={'none'}
                        p="8px"
                      >
                        <Text color="#71717A" my={'6px'} mx="4px" fontSize={'14px'}>
                          {t('common:region')}
                        </Text>
                        <Stack gap={'8px'} p="0">
                          {regionList.map((region) => (
                            <Flex
                              cursor={'pointer'}
                              key={region.uid}
                              width={'full'}
                              height="48px"
                              borderRadius="8px"
                              borderWidth="1px"
                              p={'14px 16px'}
                              gap="4px"
                              alignItems={'center'}
                              onClick={() => {
                                setSelectedRegionUid(region.uid);
                                onClose();
                              }}
                              bg={'white'}
                              _hover={{
                                bg: '#FAFAFA'
                              }}
                            >
                              <Text color={'#18181B'} fontSize={'16px'}>
                                {region?.displayName}
                              </Text>
                              <Box mx={'12px'} border={'1px solid #E4E4E7'} h={'16px'}></Box>
                              {region?.description.provider &&
                                [
                                  'volcano_engine',
                                  'alibaba_cloud',
                                  'tencent_cloud',
                                  'google_cloud'
                                ].includes(region?.description.provider) && (
                                  <Img
                                    src={`/images/cloud_providers/${region?.description.provider}.svg`}
                                  ></Img>
                                )}
                              <Text fontSize={'12px'} color={'#52525B'}>
                                {t(region?.description?.provider as I18nCloudProvidersKey, {
                                  ns: 'cloudProviders'
                                })}
                              </Text>
                              {region.uid === selectedRegion?.uid && (
                                <Icon ml={'auto'} boxSize={'16px'}>
                                  <Check color={'#2563EB'} />
                                </Icon>
                              )}
                            </Flex>
                          ))}
                        </Stack>
                      </PopoverContent>
                    </Portal>
                  </>
                )}
              </Popover>
            </FormControl>
            <FormControl mt={'8px'}>
              <FormLabel>{t('v2:create_workspace')}</FormLabel>
              <Input
                type="text"
                height={'40px'}
                bg={'white'}
                width={'full'}
                placeholder={t('common:default_team')}
                value={workspaceName}
                borderRadius={'8px'}
                onChange={(e) => {
                  setWorkspaceName(e.target.value.trim());
                }}
                onFocus={() => {
                  if (!workspaceNameFieldDirty) {
                    setWorkspaceNameFieldDirty(true);
                    setWorkspaceName('');
                  }
                }}
              />
            </FormControl>
            <Text
              width="352px"
              height="20px"
              fontFamily="Geist"
              fontStyle="normal"
              fontWeight={400}
              fontSize="14px"
              lineHeight="20px"
              color="#71717A"
            >
              {t('v2:you_may_invite_memebers_later')}
            </Text>
            <Button
              bg={'black'}
              color="white"
              mt={'16px'}
              rightIcon={<ArrowRight size={'14px'} />}
              w={'full'}
              borderRadius={'8px'}
              isLoading={mutation.status === 'loading'}
              onClick={() => handleStartDeploying()}
            >
              {t('v2:start_deploying')}
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Flex>
  );
}
