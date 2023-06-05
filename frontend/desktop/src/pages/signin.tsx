import React, { FormEventHandler, MouseEventHandler, useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/layout";
import githubIcon from "public/images/github.svg";
import wechatIcon from "public/images/wechat.svg";
import sealosTitle from "public/images/sealos-title.png";
import updateIcon from 'public/images/material-symbols_update.svg'
import saveIcon from 'public/images/ant-design_safety-outlined.svg'
import closeIcon from 'public/icons/close_white.svg'
import warnIcon from 'public/icons/warning.svg'
import NextLink from 'next/link'
import { FormErrorMessage, InputGroup, InputLeftAddon, InputRightAddon, Link } from '@chakra-ui/react'
import { Button, Flex, FormControl, FormLabel, Img, Input, Radio, Text } from "@chakra-ui/react";
import request from "@/services/request";
import useSessionStore from "@/stores/session";
import { Session } from "@/types";
import router from "next/router";

export async function getServerSideProps(context: any) {
  const wechat_client_id = process.env.WECHAT_CLIENT_ID
  const github_client_id = process.env.GITHUB_CLIENT_ID
  const service_protocol = process.env.SERVICE_PROTOCOL
  const private_protocol = process.env.PRIVATE_PROTOCOL
  const callback_url = process.env.CALLBACK_URL
  const wechat_callback = process.env.WECHAT_CALLBACK_URL
  const props = {
    wechat_client_id,
    github_client_id,
    callback_url,
    service_protocol,
    private_protocol,
    wechat_callback
  }
  return {
    props
  }
}

export default function Login(
  {
    wechat_client_id = '',
    github_client_id = '',
    callback_url = '',
    service_protocol = '',
    private_protocol = '',
    wechat_callback = ''
  }: {
    wechat_client_id: string,
    github_client_id: string,
    callback_url: string,
    service_protocol: string,
    private_protocol: string,
    wechat_callback: string
  }
) {
  const setSessionProp = useSessionStore(s => s.setSessionProp)
  const setProvider = useSessionStore(s => s.setProvider)
  const generateState = useSessionStore(s => s.generateState)
  const [remainTime, setRemainTime] = useState(0);
  const [error, setError] = useState("");
  const phoneNumber = useRef('')
  const [checkValue, setCheckValue] = useState('')
  const isValidPhoneNumber =
    () => {
      const regExp = /^1[3-9]\d{9}$/;
      return regExp.test(phoneNumber.current);
    }
  const checkIsVaild = useMemo(() => checkValue.length === 6, [checkValue])
  const oauthLogin = async ({
    url,
    provider,
  }: {
    url: string,
    provider?: 'github' | 'wechat'
  }) => {
    setProvider(provider)
    window.location.href = url;
  }
  const oAthlist: ({ src: string, cb: MouseEventHandler })[] = [
    {
      src: githubIcon.src, cb: (e) => {
        e.preventDefault()
        const state = generateState()
        oauthLogin({
          provider: 'github',
          url: `https://github.com/login/oauth/authorize?client_id=${github_client_id}&redirect_uri=${callback_url}&scope=user:email%20read:user&state=${state}`
        })
      }
    },
    {
      src: wechatIcon.src, cb: (e) => {
        e.preventDefault()
        const state = generateState()
        oauthLogin({
          provider: 'wechat',
          url: `https://open.weixin.qq.com/connect/qrconnect?appid=${wechat_client_id}&redirect_uri=${wechat_callback}&response_type=code&state=${state}&scope=snsapi_login&#wechat_redirect`
        })

      }
    }
  ]

  // 确认协议的state
  const [isAgree, setIsAgree] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const getSign: FormEventHandler = async (e) => {
    e.preventDefault()
    if (!isAgree) {
      setError('请阅读并同意下方协议')
      return
    }
    if (!checkIsVaild) {
      setError('验证码错误')
      return
    }
    if (!isValidPhoneNumber()) {
      setError('请输入有效的手机号码')
      return
    }
    setIsLoading(true)
    try {
      const { data } = await request.post<any, { data: Session }>('/api/auth/phone/verify', { phoneNumbers: phoneNumber.current, code: checkValue })
      const { token, user, kubeconfig } = data;
      setSessionProp('token', token);
      setSessionProp('user', user);
      setSessionProp('kubeconfig', kubeconfig);
      router.replace('/')
    } finally {
      setIsLoading(false)
    }

  }
  const getCode: MouseEventHandler = async (e) => {
    e.preventDefault()
    if (!isValidPhoneNumber()) {
      setError('请输入有效的手机号码')
      return
    }
    setRemainTime(60)
    await request.post<any, Session>('/api/auth/phone/sms', { phoneNumbers: phoneNumber.current })
    // vaildPhone()
  }
  useEffect(() => {
    if (remainTime <= 0) return;
    const interval = setInterval(() => {
      setRemainTime(remainTime - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [remainTime])
  return (
    <Layout>
      <FormControl
        justifyContent={'center'} alignItems={'center'} h={'full'}
        isInvalid={!!error}
        w={'full'} display={'flex'}
        flexDir={'column'}
      >
        <FormLabel
          mb={'36px'}
        >
          <Img src={sealosTitle.src} w='135px'></Img>
        </FormLabel>

        <Flex
          w='362px'
          h='349px'
          bg='rgba(255, 255, 255, 0.2)'
          boxShadow='0px 15px 20px rgba(0, 0, 0, 0.2)'
          backdropFilter='blur(100px)'
          borderRadius='12px'
          flexDir='column'
          justifyContent='center'
          align='center'
          position={'relative'}
          sx={
            {
              '> div:not(:last-child), > Button:not(:last-child)': {
                width: '266px',
                height: '42px',
                mb: '14px',
                // backdropFilter: 'blur(50px)',
                borderRadius: '4px',
                p: '10px',
              },
              '> div:has(input)': {
                background: 'rgba(255, 255, 255, 0.65)',
              }
            }
          }
        >
          <FormErrorMessage position={'absolute'} top='0' display={'flex'}
            bg={'rgba(249, 78, 97, 1)'}
            transform={'translateY(-50%)'}
          >
            <Img src={warnIcon.src} mr={'8px'}></Img>
            <Text color={'#fff'}>{error}</Text>
            <Button variant={'unstyled'} ml={'auto'}
              display={'flex'}
              justifyContent={'flex-end'}
              onClick={(e) => {
                e.preventDefault()
                setError('')
              }}><Img src={closeIcon.src}></Img></Button>
          </FormErrorMessage>
          <InputGroup variant={'unstyled'} bg='rgba(255, 255, 255, 0.65)'>
            <InputLeftAddon
            ><Text pr={'7px'}

              borderRight='1px solid rgba(0, 0, 0, 0.4)'
            >+86</Text></InputLeftAddon>

            <Input type='tel' placeholder='手机号' mx={'12px'}
              variant={'unstyled'}
              bg={'transparent'}
              id="phoneNumber"
              _autofill={{
                bg: 'transparent',
              }}
              onChange={(e) => {
                phoneNumber.current = e.currentTarget.value
              }} />
            <InputRightAddon fontStyle='normal'
              fontWeight='500'
              fontSize='10px'
              lineHeight='20px'
              color='#219BF4'>
              {remainTime <= 0 ? <Link as={NextLink} href=''
                onClick={
                  getCode
                }>
                获取验证码
              </Link> : <Text >{remainTime} s</Text>
              }
            </InputRightAddon>
          </InputGroup>

          <InputGroup variant={'unstyled'} bg='rgba(255, 255, 255, 0.65)'>
            <InputLeftAddon
            >
              <Img src={saveIcon.src}></Img>
            </InputLeftAddon>
            <Input type='password' placeholder='6 位验证码' pl={'12px'} value={checkValue}
              variant={'unstyled'}
              id="verifyCode"

              _autofill={{
                backgroundColor: 'transparent !important',
                backgroundImage: 'none !important',
              }}
              onChange={(v) => setCheckValue(v.currentTarget.value)} />
            <InputRightAddon >
              {checkIsVaild && <Img src={updateIcon.src}></Img>}
            </InputRightAddon>
          </InputGroup>
          <Radio mb={'30px'} width={'266px'}

            isChecked={isAgree}
            variant={'unstyled'}
            color={'rgba(255, 255, 255, 0.2);'}
            _selected={
              {
                color: 'rgba(0, 0, 0, 0.5)'
              }
            }
            onChange={e => {
              setIsAgree(e.currentTarget.checked)
            }}>
            <Text
              fontStyle='normal'
              fontWeight='400'
              fontSize='12px'
              lineHeight='140%'

              color='#FFFFFF'>
              我已阅读并同意 <Link
                href={service_protocol}
                _hover={
                  { color: 'rgba(94, 189, 242, 1)', borderBottom: '1px solid rgba(94, 189, 242, 1)' }
                }>服务协议</Link> 和 <Link
                  href={private_protocol}
                  _hover={
                    { color: 'rgba(94, 189, 242, 1)', borderBottom: '1px solid rgba(94, 189, 242, 1)' }
                  }>隐私协议</Link></Text>
          </Radio>

          <Button
            variant={'unstyled'}

            background='linear-gradient(90deg, #000000 0%, rgba(36, 40, 44, 0.9) 98.29%)'
            boxShadow='0px 4px 4px rgba(0, 0, 0, 0.25)'
            color='#fff'
            // onnClick={getSign}
            display={'flex'}
            justifyContent={'center'}
            alignItems={'center'}
            onClick={(e) => {
              getSign(e)
            }}
            type="submit"
            _hover={
              {
                opacity: '0.85'
              }
            }
          >
            {isLoading ? "Loading..." : "Login"}
          </Button>
          {/* </Box> */}

          <Flex gap={'14px'}>
            {
              oAthlist.map((item, index) => <Button key={(index)} onClick={item.cb} borderRadius={'full'} variant={'unstyled'}>
                <Img src={item.src} borderRadius={'full'}></Img>
              </Button>)
            }
          </Flex>
        </Flex>

      </FormControl>

    </Layout >
  );
}

