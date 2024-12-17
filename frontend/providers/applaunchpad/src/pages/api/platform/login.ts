import { authSession, getAdminAuthorization, getUserKubeConfig, getUserKubeConfigMock } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';


async function getKubeconfigForNamespace(req: NextApiRequest, namespace: string) {
  const { k8sCore } = await getK8s({
    kubeconfig: await getAdminAuthorization(req.headers)
  });

  const saName = 'default';
  const secretName = `${saName}-token`;

  let secret = null;
  try {
   secret = await k8sCore.readNamespacedSecret(secretName, namespace);
  }
  catch (err: any) {
    if (err.response?.statusCode === 404) {
      try {
        const _resp = await k8sCore.createNamespacedSecret(namespace, {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: {
            namespace: namespace,
            name: secretName,
            annotations: {
              'kubernetes.io/service-account.name': saName
            }
          },
          type: 'kubernetes.io/service-account-token'
        });

        secret = await k8sCore.readNamespacedSecret(secretName, namespace);
      }
      catch (err: any) {
        console.error(err);
        throw new Error('创建 secret 失败');
      }
    } else {
      console.error(err);
      throw new Error('获取 secret 失败');
    }
  }

  const token = secret.body.data?.token ? Buffer.from(secret.body.data.token, 'base64').toString() : '';

  if (!token) {
    throw new Error('获取 token 失败');
  }

  const kubeconfig = {
    apiVersion: 'v1',
    kind: 'Config',
    clusters: [
      {
        name: 'kubernetes',
        cluster: {
          server: 'https://'+process.env.SEALOS_DOMAIN+':6443',
          'certificate-authority-data': secret.body.data?.['ca.crt'] ?? '',
        }
      }
    ],
    contexts: [
      {
        name: 'default',
        context: {
          cluster: 'kubernetes',
          namespace: namespace,
          user: 'default'
        }
      }
    ],
    'current-context': 'default',
    users: [
      {
        name: 'default',
        user: {
          token: token
        }
      }
    ]
  };

  return kubeconfig;
}


export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { username, password } = req.body;

    // console.log('username:', username);
    // console.log('password:', password);
    // console.log('process.env.LAUNCHPAD_USERNAME:', process.env.LAUNCHPAD_USERNAME);
    // console.log('process.env.LAUNCHPAD_PASSWORD:', process.env.LAUNCHPAD_PASSWORD);

    let ticket: string;
    let kubeconfig: any;

    if (username === process.env.LAUNCHPAD_USERNAME) {
      // admin user login
      if (password === process.env.LAUNCHPAD_PASSWORD) {
        // console.log('process.env.JWT_SECRET:', process.env.JWT_SECRET);
        ticket = jwt.sign(
          { username },
          "SEALOS_SECRET",
          { expiresIn: '1h' }
        );

        // console.log('process.env.JWT_SECRET:', process.env.JWT_SECRET);

        kubeconfig =
          process.env.NODE_ENV === 'development' ? getUserKubeConfigMock() : getUserKubeConfig();
      } else {
        throw new Error('用户名或密码错误');
      }
    } else {
      // sso login
      kubeconfig = await getKubeconfigForNamespace(req, username);
      ticket = 'MOCK-TICKET';
    }

    jsonRes(res, {
      data: {
        state: {
          session: {
            token: ticket,
            user: {
              k8s_username: username,
              name: username,
            },
            kubeconfig: kubeconfig
          },
          oauth_state: "",
          token: ticket,
          lastWorkSpaceId: ""
        },
        version: 0
      }
    });

  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
