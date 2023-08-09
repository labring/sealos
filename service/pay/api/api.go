package api

import (
	"fmt"
	"net/http"

	"github.com/emicklei/go-restful"
)

type Pay struct{}

func (u Pay) RegisterPayRouter(ws *restful.WebService) {
	ws.
		Path("/pay").
		Consumes("*")
	// GET /pay/:paymethod

	ws.Route(ws.GET("").To(u.getURL).
		// docs
		Doc("get payment URL, using this URL to generate payment QRcode").
		Param(ws.QueryParameter("paymethod", "payment method").DataType("string")).
		Returns(200, "OK", nil).
		Returns(404, "Not Found", nil))
}

type PaymentRequest struct {
	AppID string `json:"appID"`
	Sign  string `json:"sign"`
}

// Get url from payment service providers (such as WeChat and Stripe)
func (u Pay) getURL(request *restful.Request, response *restful.Response) {
	paymentRequest := &PaymentRequest{}
	err := request.ReadEntity(paymentRequest)
	if err != nil {
		response.WriteHeaderAndEntity(http.StatusBadRequest, nil)
		return
	}
	appID := paymentRequest.AppID
	// TODO process the appID logic
	fmt.Sprintf(appID)

	sign := paymentRequest.Sign
	// TODO process the sign logic
	fmt.Sprintf(sign)

	paymethod := request.QueryParameter("paymethod")
	switch paymethod {
	case "wechat":
		u.GetWechatURL(request, response)
	case "stripe":
		u.GetStripeURL(request, response)
	}
}
