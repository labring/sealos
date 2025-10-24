import yaml from 'js-yaml';

interface DevboxRbacJobParams {
  devboxName: string;
  devboxNamespace: string;
  devboxUID: string;
  execCommand?: string;
}

export function generateDevboxRbacAndJob({
  devboxName,
  devboxNamespace,
  devboxUID,
  execCommand = 'nohup /home/devbox/project/entrypoint.sh & > /dev/null 2>&1'
}: DevboxRbacJobParams): string[] {
  const serviceAccount = {
    apiVersion: 'v1',
    kind: 'ServiceAccount',
    metadata: {
      name: `${devboxName}-executor`,
      namespace: devboxNamespace,
      ownerReferences: [
        {
          apiVersion: 'devbox.sealos.io/v1alpha1',
          kind: 'Devbox',
          name: devboxName,
          uid: devboxUID,
          controller: true,
          blockOwnerDeletion: false
        }
      ]
    }
  };
  const role = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'Role',
    metadata: {
      name: `${devboxName}-executor-role`,
      namespace: devboxNamespace,
      ownerReferences: [
        {
          apiVersion: 'devbox.sealos.io/v1alpha1',
          kind: 'Devbox',
          name: devboxName,
          uid: devboxUID,
          controller: true,
          blockOwnerDeletion: false
        }
      ]
    },
    rules: [
      {
        apiGroups: [''],
        resources: ['pods', 'pods/exec'],
        verbs: ['get', 'list', 'create', 'watch']
      }
    ]
  };
  const roleBinding = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'RoleBinding',
    metadata: {
      name: `${devboxName}-executor-binding`,
      namespace: devboxNamespace,
      ownerReferences: [
        {
          apiVersion: 'devbox.sealos.io/v1alpha1',
          kind: 'Devbox',
          name: devboxName,
          uid: devboxUID,
          controller: true,
          blockOwnerDeletion: false
        }
      ]
    },
    subjects: [
      {
        kind: 'ServiceAccount',
        name: `${devboxName}-executor`,
        namespace: devboxNamespace
      }
    ],
    roleRef: {
      kind: 'Role',
      name: `${devboxName}-executor-role`,
      apiGroup: 'rbac.authorization.k8s.io'
    }
  };

  const job = {
    apiVersion: 'batch/v1',
    kind: 'Job',
    metadata: {
      name: `${devboxName}-exec-job`,
      namespace: devboxNamespace,
      ownerReferences: [
        {
          apiVersion: 'devbox.sealos.io/v1alpha1',
          kind: 'Devbox',
          name: devboxName,
          uid: devboxUID,
          controller: true,
          blockOwnerDeletion: false
        }
      ]
    },
    spec: {
      ttlSecondsAfterFinished: 600,
      template: {
        spec: {
          serviceAccountName: `${devboxName}-executor`,
          containers: [
            {
              name: 'kubectl-executor',
              image: 'bitnamilegacy/kubectl:1.28.9',
              command: ['/bin/bash', '-c'],
              args: [
                `until kubectl get pod -l app.kubernetes.io/part-of=devbox,app.kubernetes.io/name=${devboxName} -o name --namespace=${devboxNamespace}; do
            sleep 5
          done
          TARGET_POD=$(kubectl get pod -l app.kubernetes.io/part-of=devbox,app.kubernetes.io/name=${devboxName} -o jsonpath='{.items[0].metadata.name}' --namespace=${devboxNamespace})
          kubectl wait --for=condition=Ready pod/$TARGET_POD --timeout=300s
          kubectl exec $TARGET_POD -- /bin/bash -c "${execCommand}"
          echo "Devbox exec success"`
              ]
            }
          ],
          restartPolicy: 'Never'
        }
      },
      backoffLimit: 0
    }
  };

  return [
    yaml.dump(serviceAccount),
    yaml.dump(role), 
    yaml.dump(roleBinding),
    yaml.dump(job)
  ];
}