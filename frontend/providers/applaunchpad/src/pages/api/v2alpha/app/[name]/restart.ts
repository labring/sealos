import type { NextApiRequest, NextApiResponse } from 'next';
import { restartApp, createK8sContext } from '@/services/backend';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    const { name } = req.query as { name: string };

    if (!name) {
      return res.status(400).json({
        error: 'App name is required'
      });
    }

    const k8s = await createK8sContext(req);

    try {
      await k8s.getDeployApp(name);
    } catch (error: any) {
      return res.status(404).json({
        error: `App ${name} not found`
      });
    }

    await restartApp(name, k8s);

    return res.status(204).end();
  } catch (err: any) {
    console.log('Restart app error:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}
