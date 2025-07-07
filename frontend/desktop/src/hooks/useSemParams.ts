import { AdClickData } from '@/types/adClick';
import { SemData } from '@/types/sem';
import { useRouter } from 'next/router';

type SemParams = {
  adClickData?: AdClickData;
  semData?: SemData;
};

export function useSemParams(): SemParams {
  const router = useRouter();

  // handle page views from ad clicks
  const { bd_vid, msclkid } = router.query;
  let adClickData: AdClickData | undefined = undefined;

  // Baidu click data
  if (bd_vid) {
    adClickData = {
      source: 'Baidu',
      clickId: bd_vid as string,
      additionalData: {
        newType: [3]
      }
    };
  } else if (msclkid) {
    // Bing click data
    adClickData = {
      source: 'Bing',
      clickId: msclkid as string,
      additionalData: {
        timestamp: Date.now()
      }
    };
  }

  // handle new user sem source
  const { search, s, k } = router.query;
  const semData: SemData = { channel: '', additionalInfo: {} };
  if (search) {
    semData.additionalInfo.searchEngine = search as string;
  }
  if (s) {
    semData.channel = s as string;
  }
  if (k) {
    semData.additionalInfo.semKeyword = k as string;
  }

  return {
    adClickData,
    semData: semData.channel ? semData : undefined
  };
}
