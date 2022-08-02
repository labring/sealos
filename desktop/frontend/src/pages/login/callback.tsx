import type { NextPage } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import fetchAPI from '../../lib/api'

const Callback: NextPage = () => {
  const [conf, setConf] = useState('')
  const [redirect, setRedirect] = useState('')

  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    const { code, state } = router.query;
    if (code !== undefined && code !== '' && state !== undefined && state != '') {
      fetchAPI('api/token', { code: code, state: state }).then((res) => {
        console.log(res)
        setConf(res)

        if (res.access_token !== '') {
          setRedirect('/dashboard')
        }
      }).catch((err) => {
        console.log(err);
      });
    }
  }, [router.isReady]);

  return <>conf: {conf}<Link href={redirect}>d∏ashboard</Link></>
}

export default Callback
