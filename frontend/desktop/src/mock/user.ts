import { CRDMeta } from '../services/backend/kubernetes';

const paymentMeta: CRDMeta = {
  group: 'account.sealos.io',
  version: 'v1',
  namespace: 'sealos-system',
  plural: 'payments'
};

const paymentCRDTemplate: string = `
apiVersion: account.sealos.io/v1
kind: Payment
metadata:
  name: {{ .payment_name }}
  namespace: {{ .namespace }}
spec:
    userID: {{ .kube_user.name }}
    amount: {{ .amount }}
`;

export { paymentMeta, paymentCRDTemplate };
