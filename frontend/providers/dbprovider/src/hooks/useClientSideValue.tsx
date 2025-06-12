import { useState, useEffect } from 'react';

export function useClientSideValue(serverValue: boolean): boolean {
  const [clientValue, setClientValue] = useState(false);

  useEffect(() => {
    setClientValue(serverValue);
  }, [serverValue]);

  return clientValue;
}
