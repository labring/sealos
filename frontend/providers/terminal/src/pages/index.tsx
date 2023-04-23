import Terminal from '@/components/terminal'
import request from '@/service/request'
import useSessionStore from '@/stores/session'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app'
import styles from './index.module.scss'

export default function Index({ envSite }: { envSite: string }) {
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

  const { data, isLoading, isError, refetch } = useQuery(
    ['applyApp'],
    () => request.post('/api/apply'),
    {
      onSuccess: (res) => {
        if (res?.data?.code === 200 && res?.data?.data) {
          const url = res?.data?.data
          fetch(url, { mode: 'no-cors' })
            .then(() => {
              setUrl(url)
              // window.location.replace(url)
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
      retry: 6,
      retryDelay: 1500,
    }
  )

  if (isLoading) {
    return <div className={clsx(styles.loading, styles.err)}>loading</div>
  }

  if (!isUserLogin() && process.env.NODE_ENV === 'production') {
    const tempUrl = envSite

    return (
      <div className={styles.err}>
        please go to &nbsp;<a href={tempUrl}>{tempUrl}</a>
      </div>
    )
  }

  if (isError) {
    return (
      <div className={styles.err}>
        There is an error on the page, try to refresh or contact the
        administrator
      </div>
    )
  }

  return (
    <div className={styles.container}>{!!url && <Terminal url={url} />}</div>
  )
}

export async function getServerSideProps() {
  return { props: { envSite: process.env.SITE } }
}
