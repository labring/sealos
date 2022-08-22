import { Loading, Grid, Dropdown, Button, Text, User, useTheme } from '@nextui-org/react';
import clsx from 'clsx';
import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/future/image';
import { useState, useEffect } from 'react';
import Script from 'next/script';
import styles from './dashboard.module.css';
import { getSession } from '../../stores/session';
import type { Session } from '../../interfaces/session';
import type { IframePage } from '../../interfaces/cloud';
import { useTheme as useNextTheme } from 'next-themes';

import IconSealOS from '../../assets/icons/sealos.svg';
import IconSun from '../../assets/icons/sun.svg';
import IconMoon from '../../assets/icons/moon.svg';
import IconSearch from '../../assets/icons/search.svg';
import IconBell from '../../assets/icons/bell.svg';
import IconDash from '../../assets/icons/dash.svg';
import IconPlus from '../../assets/icons/plus.svg';
import IconX from '../../assets/icons/x.svg';

interface Props {
  username?: string;
}

const Dashboard: NextPage<Props> = (props) => {
  const { setTheme } = useNextTheme();
  const { isDark, theme } = useTheme();

  const onChangeTheme = () => setTheme(isDark ? 'light' : 'dark');

  const [session, setSession] = useState<Session | undefined>(undefined);
  useEffect(() => {
    const session = getSession();
    if (session !== undefined) {
      setSession(session);
    }
  }, []);

  const [urls, setUrls] = useState<IframePage[] | undefined>(undefined);
  useEffect(() => {
    fetch('/api/cloud/get_all')
      .then((res) => res.json())
      .then((data) => setUrls(data.data));
  }, []);

  const [currIframe, setCurrIframe] = useState<IframePage | undefined>(undefined);

  const renderBottomDockIcon = (item: IframePage) => (
    <div key={item.title} className={styles.dockItem}>
      <div
        className={clsx(styles.bottomAction, 'bottomAction')}
        onClick={() => setCurrIframe(item)}
      >
        <Image
          alt={item.title}
          src={item.icon}
          width={36}
          height={36}
          className={clsx(styles.bottomImage, 'url-image')}
        />
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Dashboard</title>
        <meta name="description" content="sealos cloud dashboard" />
      </Head>

      <Script src="/plugins/iframeResizer.contentWindow.min.js" strategy="lazyOnload" />

      <div className={styles.mainContainer}>
        <main className={styles.main}>
          <nav className={styles.header}>
            <div className={styles.headerMenu}>
              <Grid.Container gap={0} justify="space-between">
                <Grid md>
                  <Grid.Container gap={0} justify="flex-start">
                    <Grid md style={{ flex: 'none' }}>
                      <div className={styles.headerMenuIcon} style={{ marginRight: 0 }}>
                        <IconSealOS />
                      </div>
                    </Grid>
                    <Grid md xs={0} style={{ flex: '0 1 auto' }}>
                      <Text size={12} css={{ py: 1, mr: '4px' }}>
                        SealOS Cloud
                      </Text>
                    </Grid>
                    {currIframe !== undefined && (
                      <>
                        <Grid md style={{ flex: '0 1 auto' }}>
                          <Text size={12} css={{ py: 1, mx: '4px' }} weight="bold">
                            {currIframe?.title}
                          </Text>
                        </Grid>
                        <Grid md style={{ flex: 'none' }}>
                          {session === undefined ? (
                            <Button animated={false} size="xs" light color="primary" disabled>
                              Information
                            </Button>
                          ) : (
                            <Dropdown disableAnimation>
                              <Dropdown.Button animated={false} size="xs" light color="primary">
                                Information
                              </Dropdown.Button>
                              <Dropdown.Menu aria-label="Information">
                                <Dropdown.Item key="token">
                                  {session.token.access_token}
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          )}
                        </Grid>
                        <Grid md style={{ flex: 'none' }}>
                          <Dropdown disableAnimation>
                            <Dropdown.Button animated={false} size="xs" light color="primary">
                              Actions
                            </Dropdown.Button>
                            <Dropdown.Menu aria-label="Actions">
                              <Dropdown.Item key="start">Start</Dropdown.Item>
                              <Dropdown.Item key="stop">Stop</Dropdown.Item>
                              <Dropdown.Item key="delete" withDivider color="error">
                                Delete
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </Grid>
                      </>
                    )}
                  </Grid.Container>
                </Grid>
                <Grid md style={{ flex: 'none' }}>
                  <Grid.Container gap={0} justify="flex-end">
                    {session && (
                      <Grid md css={{ py: 1 }}>
                        <User size="xs" src={session.user.avatar} name={session.user.name} />
                      </Grid>
                    )}
                    <Grid md>
                      <div className={styles.headerMenuIcon} onClick={onChangeTheme}>
                        {isDark ? <IconMoon /> : <IconSun />}
                      </div>
                    </Grid>
                    <Grid md>
                      <div className={styles.headerMenuIcon}>
                        <IconSearch />
                      </div>
                    </Grid>
                    <Grid md>
                      <div className={styles.headerMenuIcon}>
                        <IconBell />
                      </div>
                    </Grid>
                    <Grid md>
                      <div
                        className={styles.headerMenuIcon}
                        style={{ color: theme?.colors.warning.value }}
                      >
                        <IconDash />
                      </div>
                    </Grid>
                    <Grid md>
                      <div
                        className={styles.headerMenuIcon}
                        style={{ color: theme?.colors.success.value }}
                      >
                        <IconPlus />
                      </div>
                    </Grid>
                    <Grid md>
                      <div
                        className={styles.headerMenuIcon}
                        style={{ color: theme?.colors.error.value }}
                        onClick={() => setCurrIframe(undefined)}
                      >
                        <IconX />
                      </div>
                    </Grid>
                  </Grid.Container>
                </Grid>
              </Grid.Container>
            </div>
          </nav>

          <div className={styles.frameContainer}>
            {currIframe !== undefined && currIframe.url !== '' ? (
              <iframe
                className={styles.iframe}
                src={currIframe.url}
                title={currIframe.title}
                frameBorder="0"
                marginWidth={0}
                marginHeight={0}
              />
            ) : (
              <div className={styles.frameDefault}>
                <div className={styles.frameDefaultRow}>
                  <Loading type="points-opacity">Please select application below!</Loading>
                </div>
              </div>
            )}
          </div>

          <div className={styles.dockContainer}>
            <div className={styles.dockContent}>
              {urls !== undefined && urls.map((item) => renderBottomDockIcon(item))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Dashboard;
