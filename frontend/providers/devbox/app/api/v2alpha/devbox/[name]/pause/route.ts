import { NextRequest, NextResponse } from 'next/server';
import { jsonRes } from '@/services/backend/response';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { devboxKey } from '@/constants/devbox';
import { RequestSchema } from './schema';

export const dynamic = 'force-dynamic';

async function updateIngressClass(
  k8sNetworkingApp: any,
  ingressName: string,
  namespace: string,
  annotationsIngressClass?: string,
  specIngressClass?: string
) {
  const patchOptions = {
    headers: {
      'Content-Type': 'application/merge-patch+json'
    }
  };

  if (annotationsIngressClass) {
    await k8sNetworkingApp.patchNamespacedIngress(
      ingressName,
      namespace,
      { 
        metadata: { 
          annotations: { 
            'kubernetes.io/ingress.class': 'pause' 
          } 
        } 
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      patchOptions
    );
  } else if (specIngressClass) {
    await k8sNetworkingApp.patchNamespacedIngress(
      ingressName,
      namespace,
      { 
        spec: { 
          ingressClassName: 'pause' 
        } 
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      patchOptions
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const body = await req.json();
    const validationResult = RequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return jsonRes({
        code: 400,
        message: 'Invalid request body',
        error: validationResult.error.errors
      });
    }

    const devboxName = params.name;
    const headerList = req.headers;
    const { k8sCustomObjects, namespace, k8sNetworkingApp } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    const ingressesResponse = await k8sNetworkingApp.listNamespacedIngress(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `${devboxKey}=${devboxName}`
    );
    
    const ingresses = (ingressesResponse.body as { items: any[] }).items;
    console.log(`Found ${ingresses.length} ingresses for devbox: ${devboxName}`);

    const ingressUpdatePromises = ingresses
      .filter((ingress: any) => {
        const annotationsIngressClass = ingress.metadata?.annotations?.['kubernetes.io/ingress.class'];
        const specIngressClass = ingress.spec?.ingressClassName;
        
        return (annotationsIngressClass === 'nginx') || (specIngressClass === 'nginx');
      })
      .map((ingress: any) => {
        const annotationsIngressClass = ingress.metadata?.annotations?.['kubernetes.io/ingress.class'];
        const specIngressClass = ingress.spec?.ingressClassName;
        
        console.log(`Updating ingress: ${ingress.metadata.name}`);
        
        return updateIngressClass(
          k8sNetworkingApp,
          ingress.metadata.name,
          namespace,
          annotationsIngressClass,
          specIngressClass
        );
      });

    if (ingressUpdatePromises.length > 0) {
      await Promise.all(ingressUpdatePromises);
      console.log(`Successfully updated ${ingressUpdatePromises.length} ingresses`);
    }

    await k8sCustomObjects.patchNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha2',
      namespace,
      'devboxes',
      devboxName,
      { spec: { state: 'Stopped' } },
      undefined,
      undefined,
      undefined,
      {
        headers: {
          'Content-Type': 'application/merge-patch+json'
        }
      }
    );

    console.log(`Successfully paused devbox: ${devboxName}`);

    return new NextResponse(null, { status: 204 });

  } catch (err: any) {
    console.error('Pause devbox error:', err);
    
    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err : undefined
    });
  }
}