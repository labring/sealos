
import MyIcon from '@/components/Icon'
import { Box, Textarea, FormControl, Flex, Button, Center } from '@chakra-ui/react'
import { useState } from 'react'
import { useToast } from '@/hooks/useToast';
import { createConfigMap,updateConfigMap,syncConfigMap } from '@/api/configMap'
const Title = '配置管理'

const ConfigManage = () => {
    const [saveLoading,setSaveLoading] = useState(false)
    const [syncLoading,setSyncLoading] = useState(false)
    const [configInfo, setConfigInfo] = useState('')
    const { toast } = useToast();
    const handleSave = async ()=>{
        setSaveLoading(true)
        try {
            await updateConfigMap({data:configInfo})
            debugger
            toast({
                status:'success',
                title:"保存成功"
            })
            setSaveLoading(false)
        } catch (error) {
            toast({
                status:'error',
                title:"保存失败"
            })
            setSaveLoading(false)
        }
    }
    const handleSync = async ()=>{
        setSyncLoading(true)
        try {
            await syncConfigMap()
            toast({
                status:'success',
                title:"同步成功"
            })
            setSyncLoading(false)
        } catch (error) {
            toast({
                status:'error',
                title:"同步失败"
            })
            setSyncLoading(false)
        }
    }
    return <Box backgroundColor={'grayModern.100'} px={'32px'} pb={5} minH={'100%'}>
        <Flex h={'88px'} alignItems={'center'} justifyContent={'space-between'} >
            <Flex alignItems={'center'}>
                <Center
                    w="46px"
                    h={'46px'}
                    mr={4}
                    backgroundColor={'#FEFEFE'}
                    borderRadius={'md'}
                >
                    <MyIcon name="logo" w={'24px'} h={'24px'} />
                </Center>
                <Box fontSize={'xl'} color={'grayModern.900'} fontWeight={'bold'}>
                    {Title}
                </Box>
            </Flex>
            <Flex gap={2}>
                <Button  colorScheme="blue" isLoading={saveLoading} onClick={()=>{
                    handleSave();
                }}>保存</Button>
                <Button  colorScheme="blue" isLoading={syncLoading} onClick={()=>{
                    handleSync();
                }}>同步</Button>
            </Flex>
        </Flex>
        <FormControl id="configInfo" isRequired>
            <Textarea
                value={configInfo}
                onChange={(e) => setConfigInfo(e.target.value)}
                w={'full'}
                placeholder="请输入配置信息"
                bg={'#ffffff'}
                _placeholder={{ color: 'gray.500' }}
            />
        </FormControl>
    </Box>
}

export default ConfigManage