import { IncomingHttpHeaders } from 'http';
import { ErrnoCode, buildErrno } from './error';
import { getAxiosRequestConfig, getCurrentContextObject, loadKubeConfig } from './kubeconfig';

/**
 * Authenticates the Kubernetes configuration based on the incoming HTTP header.
 *
 * @param header The HTTP header containing the authentication information.
 * @throws If the header is empty or the authorization property is empty.
 * @throws If the current context or namespace is not found in the Kubernetes configuration.
 * @returns An object containing the namespace and Axios request configuration.
 */
export function authKubeConfig(header: IncomingHttpHeaders) {
  if (!header) throw buildErrno('Request header is empty', ErrnoCode.UserUnauthorized);
  const { authorization } = header;
  if (!authorization || authorization === '')
    throw buildErrno('Authorization property in Header is empty', ErrnoCode.UserUnauthorized);

  const yaml = decodeURIComponent(authorization);
  try {
    const kc = loadKubeConfig(yaml);
    const currentContextObj = getCurrentContextObject(kc.contexts, kc.currentContext);
    if (!currentContextObj) throw new Error('Current context not found');
    if (!currentContextObj.namespace) throw new Error('Namespace not found');

    const axiosRequestConfig = getAxiosRequestConfig(kc);

    return {
      namespace: currentContextObj.namespace,
      config: axiosRequestConfig
    };
  } catch (err: any) {
    throw buildErrno(err.message, ErrnoCode.UserUnauthorized);
  }
}
