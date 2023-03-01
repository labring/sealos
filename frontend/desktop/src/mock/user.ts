import { CRDMeta } from '../services/backend/kubernetes';

const paymentMeta: CRDMeta = {
  group: 'user.sealos.io',
  version: 'v1',
  namespace: 'sealos-system',
  plural: 'payments'
};

const paymentCRDTemplate: string = `
apiVersion: user.sealos.io/v1
kind: Payment
metadata:
  name: {{ .payment_name }}
  namespace: {{ .namespace }}
spec:
    userID: {{ .kube_user.name }}
    amount: {{ .amount }}
`;

export { paymentMeta, paymentCRDTemplate };
