// Copyright © 2022 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package pay

import (
	"context"
	"crypto/rand"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/wechatpay-apiv3/wechatpay-go/core"
	"github.com/wechatpay-apiv3/wechatpay-go/core/option"
	"github.com/wechatpay-apiv3/wechatpay-go/services/payments/native"
	"github.com/wechatpay-apiv3/wechatpay-go/utils"
)

// ENV keys
const (
	WechatPrivateKey           = "WechatPrivateKey"
	MchID                      = "MchID"
	MchCertificateSerialNumber = "MchCertificateSerialNumber"
	MchAPIv3Key                = "MchAPIv3Key"
	AppID                      = "AppID"
	NotifyCallbackURL          = "NotifyCallbackURL"

	StatusSuccess      = "SUCCESS"
	StatusProcessing   = "PROCESSING"
	StatusNotPay       = "NOTPAY"
	StatusFail         = "FAILED"
	DefaultCallbackURL = "https://sealos.io/payment/wechat/callback"
)

func NewClient(ctx context.Context, opts ...core.ClientOption) (*core.Client, error) {
	mchID := os.Getenv(MchID)                                           // 商户号
	mchCertificateSerialNumber := os.Getenv(MchCertificateSerialNumber) // 商户证书序列号
	mchAPIv3Key := os.Getenv(MchAPIv3Key)                               // 商户APIv3密钥
	mchPrivateKey, err := utils.LoadPrivateKey(os.Getenv(WechatPrivateKey))
	if err != nil {
		log.Print("private key is: ", os.Getenv(WechatPrivateKey))
		return nil, fmt.Errorf("load merchant private key error: %v", err)
	}
	opts = append(opts, option.WithWechatPayAutoAuthCipher(mchID, mchCertificateSerialNumber, mchPrivateKey, mchAPIv3Key))
	return core.NewClient(ctx, opts...)
}

func QueryOrder(orderID string) (string, error) {
	ctx := context.Background()
	client, err := NewClient(context.Background())
	if err != nil {
		return "", fmt.Errorf("new wechat pay client err:%s", err)
	}
	svc := native.NativeApiService{Client: client}
	resp, _, err := svc.QueryOrderByOutTradeNo(ctx,
		native.QueryOrderByOutTradeNoRequest{
			Mchid:      core.String(os.Getenv(MchID)),
			OutTradeNo: core.String(orderID),
		},
	)
	if err != nil {
		return "", fmt.Errorf("call QueryOrder err:%s", err)
	}
	return *resp.TradeState, nil
}

// 1 ¥ = amount 100
func WechatPay(amount int64, user, tradeNO, describe, callback string) (string, error) {
	ctx := context.Background()
	client, err := NewClient(context.Background())
	if err != nil {
		return "", fmt.Errorf("new wechat pay client err:%s", err)
	}

	if tradeNO == "" {
		tradeNO = GetRandomString(32)
	}
	if tradeNO == "" {
		return "", fmt.Errorf("generate tradeNO failed")
	}
	if describe == "" {
		describe = "sealos cloud recharge"
	}
	if callback == "" {
		callback = DefaultCallbackURL
	}
	svc := native.NativeApiService{Client: client}
	resp, _, err := svc.Prepay(ctx,
		native.PrepayRequest{
			Appid:         core.String(os.Getenv(AppID)),
			Mchid:         core.String(os.Getenv(MchID)),
			Description:   core.String(describe),
			OutTradeNo:    core.String(tradeNO),
			TimeExpire:    core.Time(time.Now()),
			Attach:        core.String(user),
			NotifyUrl:     core.String(callback),
			GoodsTag:      core.String("sealos recharge"),
			SupportFapiao: core.Bool(false),
			Amount: &native.Amount{
				Currency: core.String("CNY"),
				Total:    core.Int64(amount),
			},
			Detail: &native.Detail{
				CostPrice: core.Int64(608800),
				GoodsDetail: []native.GoodsDetail{
					{
						GoodsName:        core.String("sealos cloud recharge"),
						MerchantGoodsId:  core.String("ABC"),
						Quantity:         core.Int64(1),
						UnitPrice:        core.Int64(828800),
						WechatpayGoodsId: core.String("1001"),
					}},
			},
			SettleInfo: &native.SettleInfo{
				ProfitSharing: core.Bool(false),
			},
		},
	)

	if err != nil {
		return "", fmt.Errorf("call Prepay err:%s", err)
	}
	return *resp.CodeUrl, nil
}

func GetRandomString(n int) string {
	randBytes := make([]byte, n/2)
	if _, err := rand.Read(randBytes); err != nil {
		return ""
	}
	return fmt.Sprintf("%x", randBytes)
}
