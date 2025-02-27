'use client';

import { login } from '@/api/platform';
import { setUserIsLogin } from '@/utils/user';
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
import { useState } from 'react';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const toast = useToast();
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const session = await login({ username, password });
      setUserIsLogin(true, JSON.stringify(session));
      toast({
        title: '登录成功',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top'
      });
      router.push('/apps');
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
