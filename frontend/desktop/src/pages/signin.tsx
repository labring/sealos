import React, { FormEventHandler, MouseEventHandler, useEffect, useMemo, useRef, useState } from "react";
import { Image, Tab, TabIndicator, TabList, Tabs } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import githubIcon from "public/images/github.svg";
import wechatIcon from "public/images/wechat.svg";
import sealosTitle from "public/images/sealos-title.png";
import updateIcon from 'public/images/material-symbols_update.svg'
import saveIcon from 'public/images/ant-design_safety-outlined.svg'
import closeIcon from 'public/icons/close_white.svg'
import warnIcon from 'public/icons/warning.svg'
import lockIcon from 'public/images/lock.svg'
import userIcon from 'public/images/person.svg'
import NextLink from 'next/link'
import { Box, FormErrorMessage, InputGroup, InputLeftAddon, InputRightAddon, Link, useDisclosure } from '@chakra-ui/react'
import { Button, Flex, FormControl, FormLabel, Img, Input, Radio, Text } from "@chakra-ui/react";
import request from "@/services/request";
import useSessionStore from "@/stores/session";
import { ApiResp, Session } from "@/types";
import router from "next/router";
import LangSelect from "@/components/LangSelect";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import { getCookie } from "@/utils/cookieUtils";
import { TUserExist } from "@/types/user";
import { strongPassword, strongUsername } from "@/utils/crypto";
import { enableGithub, enablePassword, enableSms, enableWechat } from "@/services/enable";
function usePassword({ setError }: { setError: React.Dispatch<React.SetStateAction<string>> }) {
  const { t } = useTranslation()
  const password = useRef('')
  const __password = useRef('')
  const username = useRef('')
  // 是否为初次登录
  const [isFirst, setIsFirst] = useState(true)
  const verify = () => {
    if(!strongUsername(username.current)){
      setError(t('username tips')||'Username must be 3-16 characters, including letters, numbers')
      return false
    }
    if(!strongPassword(password.current)){
      setError(t('password tips')||'8 characters or more')
      return false
    }
    if (!username || !password.current) {
      setError(t('Invalid username or password') || 'Invalid username or password')
      return false
    }
    return true
  }
  const confirmPassword = () => {
    if (__password.current !== password.current) {
      setError(t("Invalid username or password") || 'Invalid username or password')
      return false
    }
    return true
  }
  const sign = () => request.post<any, ApiResp<Session>>('/api/auth/password', { user: username.current, password: password.current })

  const PasswordModal = () => {
    const [_password, setPassword] = useState(password.current)
    const [_username, setUsername] = useState(username.current)
    const { data } = useQuery(
      ['userExist'],
      () => request.post<any, ApiResp<TUserExist>, { user: string }>('/api/auth/password/exist', { user: _username }),
      {
        enabled: !!_username && !!_password,
      }
    )
    useEffect(() => {
      setIsFirst(!data?.data?.exist)
    }, [data])



    return <>
      <InputGroup variant={'unstyled'} bg='rgba(255, 255, 255, 0.65)' mt={'20px'}>
        <InputLeftAddon
        >
          <Img src={userIcon.src}></Img>
        </InputLeftAddon>
        <Input type='text' placeholder={t('Username') || ''} pl={'12px'} value={_username}
          variant={'unstyled'}
          fontSize='14px'
          id="username"
          fontWeight='400'
          _autofill={{
            backgroundColor: 'transparent !important',
            backgroundImage: 'none !important',
          }}
          onChange={(v) => {
            username.current = v.target.value.trim()
            setUsername(username.current)
          }} />
      </InputGroup>
      <InputGroup variant={'unstyled'} bg='rgba(255, 255, 255, 0.65)'>
        <InputLeftAddon
        >
          <Img src={lockIcon.src}></Img>
        </InputLeftAddon>
        <Input type='password' placeholder={t('Password') || ''} pl={'12px'} value={_password}
          variant={'unstyled'}
          fontSize='14px'
          id="password"
          fontWeight='400'
          _autofill={{
            backgroundColor: 'transparent !important',
            backgroundImage: 'none !important',
          }}
          onChange={(v) => {
            password.current = v.target.value.trim()
            setPassword(password.current)
          }} />
      </InputGroup>
    </>
  }
  const ConfirmPasswordModal = () => {
    const [_password, setPassword] = useState("")
    return <> <InputGroup variant={'unstyled'} bg='rgba(255, 255, 255, 0.65)'>
      <InputLeftAddon
      >
        <Img src={lockIcon.src}></Img>
      </InputLeftAddon>
      <Input type='password' placeholder={t('Verify password') || 'Verify password'} pl={'12px'} value={_password}
        fontSize='14px'
        id="repassword"
        fontWeight='400'
        variant={'unstyled'}
        _autofill={{
          backgroundColor: 'transparent !important',
          backgroundImage: 'none !important',
        }}
        onChange={(v) => {
          __password.current = v.target.value.trim()
          setPassword(__password.current)
        }} />
    </InputGroup></>
  }
  return {
    PasswordModal,
    username,
    password,
    isFirst,
    verify,
    ConfirmPasswordModal,
    confirmPassword,
    sign
  }
}
function useSms({ setError }: { setError: React.Dispatch<React.SetStateAction<string>> }) {
  const { t } = useTranslation()

  const phoneNumber = useRef('')
  const checkValue = useRef('')
  const isValidPhoneNumber =
    () => {
      const regExp = /^1[3-9]\d{9}$/;
      return regExp.test(phoneNumber.current);
    }
  const checkIsVaild = () => checkValue.current.length === 6
  const verify = () => {
    if (!checkIsVaild) {
      setError(t('Invalid verification code') || 'Invalid verification code')
      return false
    }
    if (!isValidPhoneNumber()) {
      setError(t('Invalid mobile number') || 'Invalid mobile number')
      return false
    }
    return true
  }
  const sign = () => request.post<any, ApiResp<Session>>('/api/auth/phone/verify', { phoneNumbers: phoneNumber.current, code: checkValue.current })

  const SmsModal = () => {
    const [remainTime, setRemainTime] = useState(0);
    const [_phone, setPhone] = useState(phoneNumber.current)
    const [_code, setCode] = useState(checkValue.current)
    useEffect(() => {
      if (remainTime <= 0) return;
      const interval = setInterval(() => {
        setRemainTime(remainTime - 1);
      }, 1000);
      return () => clearInterval(interval);
    }, [remainTime])
    const getCode: MouseEventHandler = async (e) => {
      e.preventDefault()
      if (!isValidPhoneNumber()) {
        setError(t('Invalid mobile number') || 'Invalid mobile number')
        return
      }
      setRemainTime(60)
      await request.post<any, Session>('/api/auth/phone/sms', { phoneNumbers: phoneNumber.current })
      // vaildPhone()
    }
    return <><InputGroup variant={'unstyled'} bg='rgba(255, 255, 255, 0.65)' mt={'20px'}>
      <InputLeftAddon
      ><Text pr={'7px'}

        borderRight='1px solid rgba(0, 0, 0, 0.4)'
      >+86</Text></InputLeftAddon>

      <Input type='tel' placeholder={t('phone number tips') || ''} mx={'12px'}
        variant={'unstyled'}
        bg={'transparent'}
        id="phoneNumber"
        fontSize='14px'
        fontWeight='400'
        _autofill={{
          bg: 'transparent',
        }}
        value={_phone}
        onChange={(e) => {
          phoneNumber.current = e.currentTarget.value.trim()
          setPhone(phoneNumber.current)
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
          {t('Get Code')}
        </Link> : <Text >{remainTime} s</Text>
        }
      </InputRightAddon>
    </InputGroup>
      <InputGroup variant={'unstyled'} bg='rgba(255, 255, 255, 0.65)'>
        <InputLeftAddon
        >
          <Img src={saveIcon.src}></Img>
        </InputLeftAddon>
        <Input type='text' placeholder={t('verify code tips') || ''} pl={'12px'}
          variant={'unstyled'}
          id="verifyCode"
          fontSize='14px'
          fontWeight='400'
          value={_code}
          _autofill={{
            backgroundColor: 'transparent !important',
            backgroundImage: 'none !important',
          }}
          onChange={(v) => {
            checkValue.current = v.currentTarget.value.trim()
            setCode(checkValue.current)
          }} />
        <InputRightAddon >
          {checkIsVaild() && <Img src={updateIcon.src}></Img>}
        </InputRightAddon>
      </InputGroup></>
  }
  return {
    SmsModal,
    phoneNumber,
    checkValue,
    verify,
    sign
  }
}
export default function Login(
  {
    wechat_client_id = '',
    github_client_id = '',
    callback_url = '',
    service_protocol = '',
    private_protocol = '',
    needPassword = false,
    needSms = false,
    needGithub = false,
    needWechat = false
  }: {
    wechat_client_id: string,
    github_client_id: string,
    callback_url: string,
    service_protocol: string,
    private_protocol: string,
    needPassword: boolean,
    needSms: boolean,
    needGithub: boolean,
    needWechat: boolean
  }
) {
  const needTabs = needPassword && needSms
  const { t, i18n } = useTranslation()
  const updateUser = useSessionStore(s => s.updateUser)
  useEffect(() => {
    const cookie = getCookie('NEXT_LOCALE')
    i18n?.changeLanguage(cookie || 'en')
  }, [])
  useEffect(() => {
    setTabIndex(needSms ? 0 : (needPassword ? 1 : -1));
  }, [needPassword, needSms])
  const disclosure = useDisclosure()
  const setSession = useSessionStore(s => s.setSession)
  const setProvider = useSessionStore(s => s.setProvider)
  const generateState = useSessionStore(s => s.generateState)
  const [error, setError] = useState("");
  const { password,
    username, PasswordModal,
    verify: passwordVerify,
    isFirst,
    sign: passwordSign,
    ConfirmPasswordModal, confirmPassword } = usePassword({ setError })
  const { SmsModal, verify: smsVerify, sign: smsSign } = useSms({ setError })
  // 对于注册的用户，需要先验证密码
  const [pageState, setPageState] = useState(0)
  const [tabIndex, setTabIndex] = useState(0)


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
  const oAthlist: ({ src: string, cb: MouseEventHandler, need: boolean })[] = [
    {
      src: githubIcon.src, cb: (e) => {
        e.preventDefault()
        const state = generateState()
        oauthLogin({
          provider: 'github',
          url: `https://github.com/login/oauth/authorize?client_id=${github_client_id}&redirect_uri=${callback_url}&scope=user:email%20read:user&state=${state}`
        })
      },
      need: needGithub
    },
    {
      src: wechatIcon.src, cb: (e) => {
        e.preventDefault()
        const state = generateState()
        oauthLogin({
          provider: 'wechat',
          url: `https://open.weixin.qq.com/connect/qrconnect?appid=${wechat_client_id}&redirect_uri=${callback_url}&response_type=code&state=${state}&scope=snsapi_login&#wechat_redirect`
        })

      },
      need: needWechat
    }
  ]

  // 确认协议的state
  const [isAgree, setIsAgree] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const verifyAgree = () => {
    if (!isAgree) {
      setError(t('Read and agree') || 'Please read and agree to the agreement below')
      return false
    }
    return true
  }
  const verify = () => ((tabIndex === 0 && smsVerify()) || (tabIndex === 1 && passwordVerify())) && verifyAgree()
  const getSign: FormEventHandler = async (e) => {
    e.preventDefault()
    if (!verify()) return
    if (tabIndex === 0) {
      setIsLoading(true)
      try {
        const { data } = await smsSign()
        setSession(data!)
        updateUser()
        router.replace('/')
      } catch (err) {
        setError(t("Invalid verification code") || 'Invalid verification code')
      } finally {
        setIsLoading(false)
      }
    } else if (tabIndex === 1) {
      if (isFirst) {
        // 首次登录，需要先确认密码
        setPageState(1)
        return
      } else {
        setIsLoading(true)
        try {
          const { data } = await request.post<any, ApiResp<Session>>('/api/auth/password', { user: username.current, password: password.current })
          setSession(data!)
          updateUser()
          router.replace('/')
        } catch {
          setError(t('Invalid username or password') || 'Invalid username or password')
        } finally {
          setIsLoading(false)
        }
      }
    }

  }
  // 确认密码后注册
  const signUpByPassword = async (e: { preventDefault: () => void; }) => {
    e.preventDefault()
    if(!confirmPassword()){
      return
    }
    setIsLoading(true)
    try {
      const { data } = await passwordSign()
      setSession(data!)
      updateUser()
      router.replace('/')
    } finally {
      setIsLoading(false)
    }
  }
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
          pt={'30px'}
          pb={'30px'}
          px={'48px'}
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
              '> div:not(:last-child):not(.chakra-tabs), > Button:not(:last-child)': {
                width:'266px',
                minH: '42px',
                mb: '14px',
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
            // width={'auto !important'}
          >
            <Img src={warnIcon.src} mr={'8px'}></Img>
            <Text color={'#fff'} >{error}</Text>
            <Button variant={'unstyled'} ml={'auto'}
              display={'flex'}
              justifyContent={'flex-end'}
              onClick={(e) => {
                e.preventDefault()
                setError('')
              }}><Img src={closeIcon.src}></Img></Button>
          </FormErrorMessage>
          {
            pageState === 0 ? <>
              {needTabs && <Tabs index={tabIndex} onChange={(idx) => setTabIndex(idx)} variant="unstyled" p={'0'} width={'full'}>
                <TabList borderBottom={'2px solid rgba(255, 255, 255, 0.3)'}
                  p={'0'}
                  fontSize={'16px'}
                  fontWeight={'500'}
                  fontFamily={'PingFang SC'}
                  color={'rgba(255, 255, 255, 0.3)'}
                  gap={'20px'}
                >
                  <Tab px='0' _selected={{ color: 'white' }}>{t("Verification Code Login")}</Tab>
                  <Tab px='0' _selected={{ color: 'white' }}>{t("Password Login")}</Tab>
                </TabList>
                <TabIndicator
                  mt="-2px"
                  height="2px"
                  bg="#FFFFFF"
                  borderRadius="1px"
                />
              </Tabs>}
              {
                (tabIndex === 0 ? <SmsModal /> : tabIndex === 1 ? <PasswordModal /> : <></>)
              }
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
                  {t('agree policy')} <Link
                    href={service_protocol}
                    _hover={
                      { color: 'rgba(94, 189, 242, 1)', borderBottom: '1px solid rgba(94, 189, 242, 1)' }
                    }>{t('Service Agreement')}</Link> {t('and')} <Link
                      href={private_protocol}
                      _hover={
                        { color: 'rgba(94, 189, 242, 1)', borderBottom: '1px solid rgba(94, 189, 242, 1)' }
                      }>{t('Privacy Policy')}</Link></Text>
              </Radio>

              <Button
                variant={'unstyled'}
                background='linear-gradient(90deg, #000000 0%, rgba(36, 40, 44, 0.9) 98.29%)'
                boxShadow='0px 4px 4px rgba(0, 0, 0, 0.25)'
                color='#fff'
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
                {isLoading ? (t('Loading') || 'Loading') + "..." : t('Log In') || "Log In"}
              </Button>

              <Flex gap={'14px'}>
                {
                  oAthlist.filter(item => item.need).map((item, index) => <Button key={(index)} onClick={item.cb} borderRadius={'full'} variant={'unstyled'}>
                    <Img src={item.src} borderRadius={'full'}></Img>
                  </Button>)
                }
              </Flex>
            </> : <>
              <Flex p={'0'} alignItems={'center'}>
                <Img src='/images/Vector.svg' w={'20px'} transform={'rotate(-90deg)'} h={'20px'} mr={'16px'} display={'inline-block'} verticalAlign={'middle'} cursor={'pointer'} onClick={() => {
                  setPageState(0)
                }}></Img>
                <Text>{t('Verify password')}</Text>
              </Flex>
              <ConfirmPasswordModal />
              <Button
                variant={'unstyled'}
                width={'266px'}
                mt={'26px'}
                mb={'90px'}
                background='linear-gradient(90deg, #000000 0%, rgba(36, 40, 44, 0.9) 98.29%)'
                boxShadow='0px 4px 4px rgba(0, 0, 0, 0.25)'
                color='#fff'
                display={'flex'}
                justifyContent={'center'}
                alignItems={'center'}
                onClick={signUpByPassword}
                type="submit"
                _hover={
                  {
                    opacity: '0.85'
                  }
                }
              >
                {isLoading ? (t('Loading') || 'Loading') + "..." : t('Log In') || "Log In"}
              </Button>
            </>
          }

        </Flex>

      </FormControl>
      <Flex
        alignItems={'center'}
        position={'absolute'}
        top={'42px'}
        right={'42px'}
        cursor={'pointer'}
        gap={'16px'}
      > <Flex
        w="36px"
        h="36px"
        borderRadius={'50%'}
        background={'rgba(244, 246, 248, 0.7)'}
        justifyContent={'center'}
        alignItems={'center'}
        position={'relative'}
        boxShadow={'0px 1.2px 2.3px rgba(0, 0, 0, 0.2)'}
      >
          <Box onClick={() => disclosure.onOpen()}>
            <Image
              width={'20px'}
              height={'20px'}
              borderRadius="full"
              src='/images/language.svg'
              fallbackSrc="/images/sealos.svg"
              alt="user avator"
            />
          </Box>
          <LangSelect disclosure={disclosure} i18n={i18n} />
        </Flex>
      </Flex>
    </Layout >
  );
}
export async function getServerSideProps({ req, res, locales }: any) {
  const local = req?.cookies?.NEXT_LOCALE || 'en';
  const wechat_client_id = process.env.WECHAT_CLIENT_ID
  const github_client_id = process.env.GITHUB_CLIENT_ID
  const service_protocol = process.env.SERVICE_PROTOCOL
  const private_protocol = process.env.PRIVATE_PROTOCOL
  const needGithub = enableGithub()
  const needWechat = enableWechat()
  const needPassword = enablePassword()
  const needSms = enableSms()
  const callback_url = process.env.CALLBACK_URL
  const props = {
    ...(await serverSideTranslations(
      local,
      undefined,
      null,
      locales || []
    )),
    wechat_client_id,
    github_client_id,
    callback_url,
    service_protocol,
    private_protocol,
    needPassword,
    needSms,
    needGithub,
    needWechat
  }
  return {
    props
  }
}

