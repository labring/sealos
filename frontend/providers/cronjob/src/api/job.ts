import { GET } from '@/services/request';
import { adaptJobList } from '@/utils/adapt';

export const getMyJobList = () => GET('/api/getJobList').then((data) => data.map(adaptJobList));
