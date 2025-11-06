import { useEffect, useState } from 'react';

export function useClientSideValue(defaultValue: boolean): boolean {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? defaultValue : false;
}
