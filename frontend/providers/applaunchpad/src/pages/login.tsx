'use client';

import { login } from '@/api/platform';
import { setMenuList, setUserIsLogin } from '@/utils/user';
import {
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  useColorModeValue,
  useToast
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getParamValue } from '@/utils/tools'
import { getRolesAndMenu } from '@/api/roles';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    const showMenu = getParamValue('showMenu')
    if (!username && !password) {
      setUsername('admin');
      setPassword('Sealos@2024');
    }
  }, []);

  useEffect(() => {
    const showMenu = getParamValue('showMenu')
    if (username && password && !showMenu) {
      handleLogin();
    }
  }, [username, password]);

  const initConfig = async (user:any)=>{
    if(user?.name === 'admin'){
     const res = await getRolesAndMenu(1)
     setMenuList(res)
    }
  }

  const handleLogin = async () => {
    const showMenu = getParamValue('showMenu')
    try {
      const session = await login({ username, password });
      console.log(session)
      const user = session?.state?.session?.user
      if(user){
        await initConfig(user)
      }
      setUserIsLogin(true, JSON.stringify(session));
      toast({
        title: '登录成功',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top'
      });
      if(showMenu){
        router.push('/apps?showMenu=true');
      }else{
        router.push('/apps');
      }
    } catch (error) {
      toast({
        position: 'top',
        title: '登录失败',
        description: '请检查用户名和密码',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  return (
    <Flex
      minH={'full'}
      width={'full'}
      align={'center'}
      justify={'center'}
      bg={useColorModeValue('gray.50', 'gray.800')}
    >
      <Stack
        spacing={4}
        w={'full'}
        maxW={'md'}
        bg={useColorModeValue('white', 'gray.700')}
        rounded={'xl'}
        boxShadow={'lg'}
        p={6}
        my={12}
      >
        <Heading lineHeight={1.1} fontSize={{ base: '2xl', md: '3xl' }}>
          登录
        </Heading>
        <FormControl id="email" isRequired>
          <FormLabel>用户名</FormLabel>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            w={'full'}
            placeholder="用户名"
            _placeholder={{ color: 'gray.500' }}
            type="text"
          />
        </FormControl>
        <FormControl id="password" isRequired>
          <FormLabel>密码</FormLabel>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            w={'full'}
            placeholder="密码"
            type="password"
          />
        </FormControl>
        <Stack spacing={6}>
          <Button onClick={handleLogin} variant={'solid'} color={'white'}>
            登录
          </Button>
        </Stack>
      </Stack>
    </Flex>
  );
}
