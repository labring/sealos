import { checkLicense } from '@/api/platform';
import { useQuery } from '@tanstack/react-query';

export const useLicenseCheck = ({ enabled }: { enabled: boolean }) => {
  const { data } = useQuery({
    queryKey: ['licenseCheck'],
    queryFn: checkLicense,
    enabled,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 3
  });

  return {
    hasLicense: data?.data?.hasLicense ?? null
  };
};
