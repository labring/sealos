import request from '@/service/request'
import useSessionStore from '@/stores/session'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app'
import styles from './index.module.scss'

export default function Index() {
  const { setSession, isUserLogin } = useSessionStore()
  const [url, setUrl] = useState('')

  useEffect(() => {
    return createSealosApp()
  }, [])

  useEffect(() => {
    const initApp = async () => {
      try {
        const result = await sealosApp.getUserInfo()
        setSession(result)
      } catch (error) {}
    }
    initApp()
  }, [setSession])

  const { data, isLoading, refetch, isError } = useQuery(
    ['applyApp'],
    () => request.post('/api/apply'),
    {
      onSuccess: (res) => {
        if (res?.data?.code === 200 && res?.data?.data) {
          const url = res?.data?.data
          fetch(url, { mode: 'no-cors' })
            .then(() => {
              setUrl(url)
              window.location.replace(url)
            })
            .catch((err) => console.log(err))
        }
        if (res?.data?.code === 201) {
          refetch()
        }
      },
      onError: (err) => {
        console.log(err, 'err')
      },
      refetchInterval: url === '' ? 1000 : false,
      enabled: url === '',
    }
  )
  if (isLoading) {
    return <div className={clsx(styles.loading, styles.err)}>loading</div>
  }

  if (!isUserLogin && isError) {
    return (
      <div className={styles.err}>
        please go to &nbsp;<a href="https://cloud.sealos.io/">sealos</a>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {!!url && (
        <iframe
          src={url}
          allow="camera;microphone;clipboard-write;"
          className={styles.iframeWrap}
        />
      )}
    </div>
  )
}
