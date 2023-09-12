import { DELETE, GET, POST } from '@/services/request';
import { adaptCronJobDetail, adaptCronJobList, adaptEvents, adaptJobItemList } from '@/utils/adapt';
import { V1Pod, V1PodList } from '@kubernetes/client-node';

export const applyYamlList = (yamlList: string[], type: 'create' | 'replace' | 'update') =>
  POST('/api/applyYamlList', { yamlList, type });

export const getCronJobList = () =>
  GET('/api/cronjob/getCronJobList').then((data) => data.map(adaptCronJobList));

export const getCronJobByName = (name: string) =>
  GET(`/api/cronjob/getByName?name=${name}`).then(adaptCronJobDetail);

export const delCronJobByName = (name: string) => DELETE('/api/cronjob/delByName', { name });

export const updateCronJobStatus = ({
  jobName,
  type
}: {
  jobName: string;
  type: 'Stop' | 'Start';
}) => POST('/api/cronjob/startAndStop', { jobName, type });

export const getJobList = (name: string) =>
  GET(`/api/job/list?cronJobName=${name}`).then(adaptJobItemList);

export const getJobEvents = (name: string) => GET(`/api/job/event?name=${name}`).then(adaptEvents);

export const getJobListAndEvents = (name: string) =>
  getJobList(name).then(async (res) => {
    const promises = res.history.map(async (item) => {
      const events = await getJobEvents(item.name!);
      item.events = events;
      return item;
    });
    const jobsWithEvents = await Promise.all(promises);
    return {
      total: res.total,
      successAmount: res.successAmount,
      history: jobsWithEvents
    };
  });

export const getPodLogs = (podName: string) => GET<string>(`/api/getPodLogs?podName=${podName}`);

export const getPodList = () => GET<V1PodList>(`/api/getPodList`);

export const getJobListEventsAndLogs = async (cronJobName: string) => {
  const jobs = await getJobList(cronJobName);
  const podList = await getPodList();

  const podJobMap = new Map<string, V1Pod>();
  podList.items.forEach((pod) => {
    const labels = pod.metadata?.labels || {};
    const podJobName = labels['job-name'];
    if (podJobName) {
      podJobMap.set(podJobName, pod);
    }
  });

  for (let i = 0; i < jobs.history.length; i++) {
    const job = jobs.history[i];
    if (!job?.name) continue;
    const events = await getJobEvents(job.name);
    job.events = events;

    const jobPod = podJobMap.get(job.name);
    if (!jobPod?.metadata?.name) continue;
    getPodLogs(jobPod?.metadata?.name)
      .then((podLog) => {
        job.logs = podLog;
        job.podName = jobPod?.metadata?.name || '';
      })
      .catch((err) => {
        job.logs = err;
        job.podName = jobPod?.metadata?.name || '';
      });
  }

  return {
    total: jobs.total || 0,
    successAmount: jobs.successAmount || 0,
    history: jobs.history || []
  };
};
