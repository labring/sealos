// Authentication services
export * from './auth';

// Kubernetes services
export * from './kubernetes';

// Application services
export * from './appService';

// Response utilities
export * from './response';

// Helper function to create K8s context from request
import type { NextApiRequest } from 'next';
import { authSession } from './auth';
import { getK8s } from './kubernetes';
import type { K8sContext } from './appService';

/**
 * Create K8s context from request headers
 * @param req NextJS API request object
 * @returns K8sContext for service layer functions
 */
export async function createK8sContext(req: NextApiRequest): Promise<K8sContext> {
  const kubeconfig = await authSession(req.headers);
  return await getK8s({ kubeconfig });
}
