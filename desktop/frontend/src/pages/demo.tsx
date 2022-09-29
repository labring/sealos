import React, { useEffect } from 'react';
import ClientSDK from 'sealos-desktop-sdk';
const sdk = new ClientSDK({
  appKey: 'this is your appKey',
  appName: 'SDK-DEMO'
});

export default function Demo() {
  useEffect(() => {
    (async () => {
      const isConnect = await sdk.connect();
      console.log('is connect: ', isConnect);
      const userInfo = await sdk.getUserInfo();
      console.log('user info: ', userInfo);
    })();

    return () => {};
  }, []);

  return <div>Demo</div>;
}
