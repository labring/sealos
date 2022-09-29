import React, { useEffect, useState } from 'react';
import ClientSDK from 'sealos-desktop-sdk';
const sdk = new ClientSDK({
  appKey: 'this is your appKey',
  appName: 'SDK-DEMO'
});

export default function Demo() {
  const [userInfo, setUserInfo] = useState<any>({});
  const [connected, setConnected] = useState<boolean>(false);
  useEffect(() => {
    (async () => {
      const connectRes = await sdk.connect();
      setConnected(connectRes.connect);
      const userInfo = await sdk.getUserInfo();
      console.log('user info: ', userInfo);
      setUserInfo(userInfo);
    })();

    return () => {};
  }, []);

  return (
    <div>
      <div>connected: {connected.toString()}</div>
      <div>user info: {JSON.stringify(userInfo)}</div>
    </div>
  );
}
