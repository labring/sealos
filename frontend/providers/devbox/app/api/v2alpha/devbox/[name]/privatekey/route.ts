import { NextRequest, NextResponse } from 'next/server';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { sendError, ErrorType, ErrorCode } from '@/lib/v2alpha/error';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const { name: devboxName } = params;

    if (!devboxName) {
      return sendError({
        status: 400,
        type: ErrorType.VALIDATION_ERROR,
        code: ErrorCode.INVALID_PARAMETER,
        message: 'Devbox name is required'
      });
    }

    const { k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    // Get secret from Kubernetes
    const secretResponse = await k8sCore.readNamespacedSecret(devboxName, namespace);
    const secret = secretResponse.body;

    // Get base64 encoded private key
    const base64PrivateKey = secret?.data?.['SEALOS_DEVBOX_PRIVATE_KEY'] as string | undefined;

    if (!base64PrivateKey) {
      return sendError({
        status: 404,
        type: ErrorType.RESOURCE_ERROR,
        code: ErrorCode.NOT_FOUND,
        message: 'Private key not found for this devbox'
      });
    }

    // Decode base6
    const privateKey = Buffer.from(base64PrivateKey, 'base64').toString('utf-8');
    return NextResponse.json({
      privateKey: privateKey
    });
  } catch (err: any) {
    console.error('Get devbox private key error:', err);

    if (err.statusCode === 404 || err.response?.statusCode === 404) {
      return sendError({
        status: 404,
        type: ErrorType.RESOURCE_ERROR,
        code: ErrorCode.NOT_FOUND,
        message: 'Devbox or secret not found'
      });
    }

    return sendError({
      status: 500,
      type: ErrorType.INTERNAL_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: err?.message || 'Internal server error'
    });
  }
}
