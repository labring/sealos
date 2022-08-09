import type { NextPage } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { fetchPost } from '../../lib/api'
import { OAuthToken, Session, setSession, UserInfo } from '../../store/session'

const Callback: NextPage = () => {
  const [otoken, setOToken] = useState<any>(null)
  const [uinfo, setUInfo] = useState<any>(null)
  const [redirect, setRedirect] = useState('')

  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    const { code, state } = router.query;
    if (code !== undefined && code !== '' && state !== undefined && state != '') {
      fetchPost('api/token', { code: code, state: state }).then((token) => {
        console.log(token)
        setOToken(JSON.stringify(token))

        const oauth_token = token as OAuthToken;
        if (oauth_token.access_token !== '') {
          fetchPost('api/userinfo', { code: code, state: state }, { authorization: 'Bearer ' + oauth_token.access_token }).then((userinfo) => {
            console.log(userinfo)
            setUInfo(JSON.stringify(userinfo))

            const user_info = userinfo as UserInfo;
            if (user_info.uid !== '') {
              const session: Session = { token: oauth_token, user: user_info }
              setSession(session);

              setRedirect('/dashboard');
            }
          }).catch((err) => {
            console.log(err);
          });
        }
      }).catch((err) => {
        console.log(err);
      });
    }
  }, [router.isReady]);

  useEffect(() => {
    if (redirect === '') return;

    const timer = setTimeout(() => {
      router.replace('/dashboard');
    }, 5000);
    return () => clearTimeout(timer);
  }, [redirect]);

  return (
    <>
      <pre>{uinfo}</pre>
      <pre>{otoken}</pre>
      <Link href={redirect}>dashboard</Link>
    </>
  )
}

export default Callback