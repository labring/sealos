package services

import (
	"errors"
	"fmt"
	"strconv"
	"time"

	defaultAlipayClient "github.com/alipay/global-open-sdk-go/com/alipay/api"
	"github.com/alipay/global-open-sdk-go/com/alipay/api/model"
	"github.com/alipay/global-open-sdk-go/com/alipay/api/request/pay"
	responsePay "github.com/alipay/global-open-sdk-go/com/alipay/api/response/pay"
	"github.com/alipay/global-open-sdk-go/com/alipay/api/tools"
	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
)

type AtomPaymentService struct {
	Client             *defaultAlipayClient.DefaultAlipayClient
	PaymentRedirectURL string
	PaymentNotifyURL   string
}

func NewPaymentService(
	client *defaultAlipayClient.DefaultAlipayClient,
	notifyURL, redirectURL string,
) *AtomPaymentService {
	return &AtomPaymentService{
		Client:             client,
		PaymentNotifyURL:   notifyURL,
		PaymentRedirectURL: redirectURL,
	}
}

// PaymentRequest 支付请求参数
type PaymentRequest struct {
	RequestID     string
	UserUID       uuid.UUID
	Amount        int64
	Currency      string
	UserAgent     string
	ClientIP      string
	DeviceTokenID string
}

func (s *AtomPaymentService) CheckRspSign(
	requestURI, httpMethod, clientID, respTime, responseBody, signature string,
) (bool, error) {
	return tools.CheckSignature(
		requestURI,
		httpMethod,
		clientID,
		respTime,
		responseBody,
		signature,
		s.Client.AlipayPublicKey,
	)
}

func (s *AtomPaymentService) GenSign(httpMethod, path, reqTime, reqBody string) (string, error) {
	return tools.GenSign(
		httpMethod,
		path,
		s.Client.ClientId,
		reqTime,
		reqBody,
		s.Client.MerchantPrivateKey,
	)
}

func (s *AtomPaymentService) CreateNewPayment(
	req PaymentRequest,
) (*responsePay.AlipayPayResponse, error) {
	return s.createPaymentWithMethod(
		req,
		s.createNewCardPaymentMethod(),
		s.PaymentRedirectURL+"/?paymentType=ACCOUNT_RECHARGE",
		s.PaymentNotifyURL+"/payment/v1alpha1/notify",
	)
}

func (s *AtomPaymentService) CreatePaymentWithCard(
	req PaymentRequest,
	card *types.CardInfo,
) (*responsePay.AlipayPayResponse, error) {
	return s.createPaymentWithMethod(
		req,
		s.createCardPaymentMethod(card),
		s.PaymentRedirectURL+"/?paymentType=ACCOUNT_RECHARGE",
		s.PaymentNotifyURL+"/payment/v1alpha1/notify",
	)
}

func (s *AtomPaymentService) CreateNewSubscriptionPay(
	req PaymentRequest,
) (*responsePay.AlipayPayResponse, error) {
	return s.createPaymentWithMethod(
		req,
		s.createNewCardPaymentMethod(),
		s.PaymentRedirectURL+"/?paymentType=SUBSCRIPTION",
		s.PaymentNotifyURL+"/payment/v1alpha1/subscription/notify",
	)
}

func (s *AtomPaymentService) CreateSubscriptionPayWithCard(
	req PaymentRequest,
	card *types.CardInfo,
) (*responsePay.AlipayPayResponse, error) {
	return s.createPaymentWithMethod(
		req,
		s.CreateSubscriptionPay(card),
		s.PaymentRedirectURL+"/?paymentType=SUBSCRIPTION",
		s.PaymentNotifyURL+"/payment/v1alpha1/subscription/notify",
	)
}

func (s *AtomPaymentService) GetPayment(
	paymentRequestID, paymentID string,
) (*responsePay.AlipayPayQueryResponse, error) {
	queryRequest := pay.AlipayPayQueryRequest{}
	queryRequest.PaymentRequestId = paymentRequestID
	queryRequest.PaymentId = paymentID
	request := queryRequest.NewRequest()
	execute, err := s.Client.Execute(request)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query request: %w", err)
	}
	response, ok := execute.(*responsePay.AlipayPayQueryResponse)
	if !ok {
		return nil, errors.New("response is not AlipayPayQueryResponse type")
	}
	return response, nil
}

func (s *AtomPaymentService) createPaymentWithMethod(
	req PaymentRequest,
	method *model.PaymentMethod,
	redirectPath, notifyPath string,
) (*responsePay.AlipayPayResponse, error) {
	payRequest, request := pay.NewAlipayPayRequest()
	request.PaymentRequestId = req.RequestID

	// 设置订单信息
	order := s.createOrder(req)
	request.Order = order

	request.PaymentAmount = model.NewAmount(strconv.FormatInt(req.Amount/10000, 10), req.Currency)

	// 设置支付方法
	request.PaymentMethod = method
	request.PaymentExpiryTime = time.Now().Add(10 * time.Minute).Format(time.RFC3339)

	// 设置环境信息
	request.Env = &model.Env{
		TerminalType:  "WEB",
		UserAgent:     req.UserAgent,
		ClientIp:      req.ClientIP,
		DeviceTokenId: req.DeviceTokenID,
	}

	// TODO 设置其他必要信息
	request.PaymentRedirectUrl = redirectPath
	request.PaymentNotifyUrl = notifyPath
	request.PaymentFactor = &model.PaymentFactor{
		IsAuthorization: true,
		CaptureMode:     "AUTOMATIC",
	}
	request.SettlementStrategy = &model.SettlementStrategy{
		SettlementCurrency: req.Currency,
	}
	request.ProductCode = model.CASHIER_PAYMENT

	// 执行支付请求
	execute, err := s.Client.Execute(payRequest)
	if err != nil {
		return nil, err
	}
	resp, ok := execute.(*responsePay.AlipayPayResponse)
	if !ok {
		return nil, errors.New("resp is not AlipayPayResponse type")
	}
	return resp, nil
}

func (s *AtomPaymentService) createOrder(req PaymentRequest) *model.Order {
	amount := strconv.FormatInt(req.Amount/10000, 10)
	return &model.Order{
		OrderDescription: "payment",
		ReferenceOrderId: uuid.NewString(),
		OrderAmount:      model.NewAmount(amount, req.Currency),
		Buyer: &model.Buyer{
			ReferenceBuyerId: req.UserUID.String(),
		},
		Goods: []model.Goods{
			{
				ReferenceGoodsId:   uuid.NewString(),
				GoodsName:          fmt.Sprintf("account %b balance", req.Amount/10000),
				GoodsQuantity:      amount,
				DeliveryMethodType: "DIGITAL",
				GoodsUnitAmount: &model.Amount{
					Currency: req.Currency,
					Value:    "1",
				},
				GoodsCategory: "Hosting",
			},
		},
	}
}

func (s *AtomPaymentService) createNewCardPaymentMethod() *model.PaymentMethod {
	return &model.PaymentMethod{
		PaymentMethodType: "CARD",
		PaymentMethodMetaData: map[string]any{
			"is3DSAuthentication": false,
			"tokenize":            true,
			"billingAddress": map[string]string{
				"region": "CN",
			},
		},
	}
}

func (s *AtomPaymentService) createCardPaymentMethod(card *types.CardInfo) *model.PaymentMethod {
	return &model.PaymentMethod{
		PaymentMethodType: "CARD",
		PaymentMethodMetaData: map[string]any{
			"is3DSAuthentication": false,
			"billingAddress": map[string]string{
				"region": "CN",
			},
			"isCardOnFile": true,
		},
		PaymentMethodId: card.CardToken,
	}
}

func (s *AtomPaymentService) CreateSubscriptionPay(card *types.CardInfo) *model.PaymentMethod {
	return &model.PaymentMethod{
		PaymentMethodType: "CARD",
		PaymentMethodMetaData: map[string]any{
			"isCardOnFile":                true,
			"recurringType":               "SCHEDULED",
			"networkTransactionId":        card.NetworkTransactionID,
			"enableAuthenticationUpgrade": false,
			"is3DSAuthentication":         false,
		},
		PaymentMethodId: card.CardToken,
	}
}

// QueryPayment 查询支付状态
func (s *AtomPaymentService) QueryPayment(
	paymentRequestID, paymentID string,
) (*responsePay.AlipayPayQueryResponse, error) {
	if paymentRequestID == "" && paymentID == "" {
		return nil, errors.New("paymentRequestID and paymentID cannot both be empty")
	}
	resp, err := s.GetPayment(paymentRequestID, paymentID)
	if err != nil {
		return nil, fmt.Errorf("failed to query payment: %w", err)
	}
	return resp, nil
}

// check resultStatus = "S" And ResultCode = "SUCCESS"
func (s *AtomPaymentService) CancelPayment(
	paymentRequestID, paymentID string,
) (*responsePay.AlipayPayCancelResponse, error) {
	if paymentRequestID == "" && paymentID == "" {
		return nil, errors.New("paymentRequestID and paymentID cannot both be empty")
	}
	request, cancelRequest := pay.NewAlipayPayCancelRequest()
	cancelRequest.PaymentRequestId = paymentRequestID
	cancelRequest.PaymentId = paymentID
	execute, err := s.Client.Execute(request)
	if err != nil {
		return nil, fmt.Errorf("failed to execute cancel request: %w", err)
	}
	response, ok := execute.(*responsePay.AlipayPayCancelResponse)
	if !ok {
		return nil, errors.New("response is not AlipayPayCancelResponse type")
	}
	return response, nil
}
