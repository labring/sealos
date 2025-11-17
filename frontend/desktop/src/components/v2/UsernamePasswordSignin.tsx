import {
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  Input,
  InputGroup,
  InputRightElement,
  Stack,
  Text,
  useColorModeValue,
  useToast
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { Eye, EyeOff, OctagonAlertIcon, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';

import { passwordLoginRequest } from '@/api/auth';
import useSessionStore from '@/stores/session';
import { getAdClickData, getInviterId, getUserSemData, sessionConfig } from '@/utils/sessionConfig';
import { SemData } from '@/types/sem';
import { AdClickData } from '@/types/adClick';
import { getRegionToken } from '@/api/auth';

// Form validation schema - simplified for login only
const loginSchema = z.object({
  username: z.string().min(1, { message: 'Username is required' }),
  password: z.string().min(1, { message: 'Password is required' })
});

type LoginFormData = z.infer<typeof loginSchema>;

interface UsernamePasswordSigninProps {
  onBack?: () => void;
}

export default function UsernamePasswordSignin({ onBack }: UsernamePasswordSigninProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const toast = useToast();
  const { setToken } = useSessionStore();

  const [showPassword, setShowPassword] = useState(false);

  const bg = useColorModeValue('white', 'gray.700');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange'
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const inviterId = getInviterId();
      const semData: SemData | null = getUserSemData();
      const adClickData: AdClickData | null = getAdClickData();

      const result = await passwordLoginRequest({
        user: data.username,
        password: data.password,
        inviterId,
        semData,
        adClickData
      });

      return result;
    },
    onSuccess: async (result) => {
      if (result?.data?.token) {
        setToken(result.data.token);
        if (result.data.needInit) {
          await router.replace('/workspace');
        } else {
          const regionTokenRes = await getRegionToken();
          if (regionTokenRes?.data) {
            await sessionConfig(regionTokenRes.data);
            await router.replace('/');
          }
        }

        return;
      }

      throw new Error('Invalid username or password');
    },
    onError: (error: any) => {
      console.error('Login failed:', error);

      // Handle authentication errors (500 status code with specific messages)
      const errorMessage = error?.message || 'Login failed';

      if (errorMessage === 'User not found.' || errorMessage === 'Incorrect password.') {
        setError('password', {
          type: 'manual',
          message: t('common:invalid_username_or_password')
        });
      } else {
        toast({
          title: t('v2:unknown_error'),
          description: errorMessage,
          status: 'error',
          duration: 3000,
          isClosable: true,
          position: 'top'
        });
      }
    }
  });

  const onSubmit = async (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <Flex minH="100vh" align="center" justify="center" bg={bg} direction={'column'}>
      <Stack mx="auto" maxW="lg" px={4} gap={'16px'} width="360px" minW={'352px'}>
        <Text fontSize={'24px'} fontWeight={600} mb={'16px'} mx="auto">
          {t('v2:sign_in')}
        </Text>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={'16px'}>
            {/* Username Field */}
            <FormControl isInvalid={!!errors.username}>
              <Input
                boxSize="border-box"
                display="flex"
                flexDirection="row"
                alignItems="center"
                padding="8px 12px"
                gap="4px"
                height="40px"
                background="#FFFFFF"
                border="1px solid #E4E4E7"
                borderRadius="8px"
                flex="none"
                order="0"
                placeholder={t('common:username')}
                alignSelf="stretch"
                w={'full'}
                fontSize={'14px'}
                {...register('username')}
              />
              <FormErrorMessage>{errors.username?.message}</FormErrorMessage>
            </FormControl>

            {/* Password Field */}
            <FormControl isInvalid={!!errors.password}>
              <InputGroup>
                <Input
                  boxSize="border-box"
                  display="flex"
                  flexDirection="row"
                  alignItems="center"
                  padding="8px 12px"
                  gap="4px"
                  height="40px"
                  background="#FFFFFF"
                  border="1px solid #E4E4E7"
                  borderRadius="8px"
                  flex="none"
                  order="0"
                  placeholder={t('common:password')}
                  alignSelf="stretch"
                  w={'full'}
                  fontSize={'14px'}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                />
                <InputRightElement>
                  <Button
                    marginTop={'8px'}
                    marginRight={'8px'}
                    variant="ghost"
                    size="md"
                    padding={'0'}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    _hover={{ bg: 'transparent' }}
                  >
                    {showPassword ? (
                      <EyeOff size={'16px'} color="#71717A" />
                    ) : (
                      <Eye size={'16px'} color="#71717A" />
                    )}
                  </Button>
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
            </FormControl>

            {/* Submit Button */}
            <Button
              type="submit"
              bgColor={'#0A0A0A'}
              borderRadius={'8px'}
              variant={'solid'}
              px={'0'}
              rightIcon={<ArrowRight size={'16px'} />}
              isLoading={isSubmitting || loginMutation.isLoading}
              loadingText={t('common:loading')}
              color="white"
              _hover={{ bg: '#1F1F23' }}
              height="40px"
            >
              {t('v2:sign_in')}
            </Button>
          </Stack>
        </form>

        {/* Back Button */}
        <Flex justifyContent={'flex-start'}>
          <Button
            bg={'white'}
            color={'#18181B'}
            borderWidth={1}
            borderColor={'grayModern.200'}
            _hover={{ bg: 'grayModern.50' }}
            onClick={handleBack}
            borderRadius={'8px'}
            variant="outline"
            height="40px"
            w={'full'}
          >
            {t('v2:back')}
          </Button>
        </Flex>
      </Stack>
    </Flex>
  );
}
