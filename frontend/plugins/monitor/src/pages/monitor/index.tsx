import { useLoading } from '@/hooks/useLoading';
import { useToast } from '@/hooks/useToast';
import {
  CONFIG_MAP_STORE,
  DEPLOYMENT_STORE,
  PERSISTENT_VOLUME_CLAIM_STORE,
  POD_STORE,
  STATEFUL_SET_STORE
} from '@/store/static';
import { RequestController } from '@/utils/request-controller';
import { CreateToastFnReturn } from '@chakra-ui/react';
import { isError } from 'lodash';
import { useEffect, useRef } from 'react';
import OverviewPage from './components/overview';
import { observer } from 'mobx-react';

const Home = observer(() => {
  const { isLoading, setIsLoading, Loading } = useLoading();
  const { toast } = useToast();

  const requestController = useRef(new RequestController({ timeoutDuration: 5000 }));

  useEffect(() => {
    (async () => {
      const res = await fetchData(requestController.current);
      toastErrors(res, toast);
      setIsLoading(false);
    })();
  });

  return <>{isLoading ? <Loading loading={isLoading} /> : <OverviewPage />}</>;
});

const fetchData = (requestController: RequestController) => {
  const tasks = [
    POD_STORE.fetchData,
    DEPLOYMENT_STORE.fetchData,
    STATEFUL_SET_STORE.fetchData,
    PERSISTENT_VOLUME_CLAIM_STORE.fetchData,
    CONFIG_MAP_STORE.fetchData
  ];
  return requestController.runTasks(tasks);
};

const toastErrors = (res: any[], toast: CreateToastFnReturn) => {
  if (isError(res)) {
    toast({
      title: 'Error',
      description: res.message,
      status: 'error'
    });
  }
};

export default Home;
