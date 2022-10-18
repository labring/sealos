import React, { useState } from 'react';
import { Button, Input, Link, Spinner, Text } from '@fluentui/react-components';
import { QRCodeSVG } from 'qrcode.react';

import { useMutation, useQuery } from '@tanstack/react-query';
import request from 'services/request';

import useAppStore from 'stores/app';
import useSessionStore from 'stores/session';
import {
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent
} from '@fluentui/react-components';

export default function ChargeButton() {
  const session = useSessionStore((s) => s.session);
  const { toggleStartMenu } = useAppStore((s) => s);

  const [chargeAmount, setChargeAmount] = useState(0);

  const [paymentName, setPaymentName] = useState('');

  const createPaymentRes = useMutation(
    (data: { amount: number; kubeconfig: string }) =>
      request.post('/api/kubernetes/account/payment', data),
    {
      onSuccess(data) {
        setPaymentName(data.data.payment_name);
      }
    }
  );

  const queryChargeRes = useQuery(
    ['query-charge-res'],
    () => {
      return request.post(`/api/kubernetes/account/payment/${paymentName}`, {
        kubeconfig: session.kubeconfig
      });
    },
    {
      refetchInterval: paymentName !== '' ? 1000 : false,
      enabled: paymentName !== ''
    }
  );

  return (
    <Dialog
      modalType="non-modal"
      onOpenChange={(event: any, data: any) => {
        if (!data.open) {
          setPaymentName('');
        }
      }}
    >
      <DialogTrigger>
        <span
          style={{ fontSize: 18, color: '#000' }}
          onClick={(e) => {
            toggleStartMenu();
          }}
        >
          立即充值
        </span>
      </DialogTrigger>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>充值</DialogTitle>
          <DialogContent>
            <div className="flex flex-col items-center justify-center " style={{ minHeight: 400 }}>
              <div>
                <span>金额：</span>
                <Input
                  onChange={(e) => {
                    setChargeAmount(parseInt(e.target.value));
                  }}
                  type="number"
                  size="large"
                  contentBefore={<Text size={400}>￥</Text>}
                  contentAfter={<Text size={400}>元</Text>}
                />
                <Button
                  size="large"
                  appearance="primary"
                  disabled={chargeAmount === 0 || paymentName !== ''}
                  className="!ml-4"
                  onClick={() => {
                    createPaymentRes.mutate({
                      amount: chargeAmount * 100,
                      kubeconfig: session.kubeconfig
                    });
                  }}
                >
                  去充值
                </Button>
              </div>

              <div className="mt-10">
                {createPaymentRes.isLoading ? (
                  <Spinner />
                ) : paymentName !== '' && !!queryChargeRes.data?.data?.codeURL ? (
                  <>
                    <QRCodeSVG
                      size={240}
                      value={queryChargeRes.data?.data?.codeURL}
                      style={{ margin: '0 auto' }}
                    />
                    <p className="mt-4 mb-4 text-slate-500 text-center">请使用微信扫码支付</p>
                    <div>
                      <p>
                        <span className="text-gray-400">支付单号：</span>
                        {queryChargeRes.data?.data?.tradeNO}
                      </p>
                      <p>
                        <span className="text-gray-400">支付结果：</span>
                        {queryChargeRes.data?.data?.status ? '' : '支付中...'}
                      </p>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
