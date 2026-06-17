import type { AppNetworkRouteType } from '@/types/app';

const targetsMainService = (route: AppNetworkRouteType, networkServiceName?: string) =>
  !route.serviceName || (!!networkServiceName && route.serviceName === networkServiceName);

export const syncDefaultRouteServicePort = ({
  routes,
  previousPort,
  nextPort,
  defaultServicePort = previousPort,
  networkServiceName
}: {
  routes?: AppNetworkRouteType[];
  previousPort: number;
  nextPort: number;
  defaultServicePort?: number;
  networkServiceName?: string;
}) => {
  const oldPort = Number(previousPort);
  const newPort = Number(nextPort);
  const defaultPort = Number(defaultServicePort);

  if (
    !routes?.length ||
    !oldPort ||
    !newPort ||
    (oldPort === newPort && defaultPort === oldPort)
  ) {
    return routes;
  }

  let changed = false;
  const nextRoutes = routes.map((route) => {
    const routePort = route.servicePort === undefined ? undefined : Number(route.servicePort);

    if (
      targetsMainService(route, networkServiceName) &&
      (routePort === undefined || routePort === oldPort || routePort === defaultPort)
    ) {
      changed = true;
      return {
        ...route,
        servicePort: newPort
      };
    }

    return route;
  });

  return changed ? nextRoutes : routes;
};
