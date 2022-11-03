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

package api

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/labring/sealos/pkg/pay"

	restful "github.com/emicklei/go-restful/v3"
	"github.com/go-openapi/spec"
)

type Payment struct{}

// WebService creates a new service that can handle REST requests for User resources.
func (u Payment) WebService() *restful.WebService {
	ws := new(restful.WebService)
	ws.
		Path("/payment").
		Consumes("*")
	ws.Route(ws.GET("/wechat/code-url").To(u.getCodeURL).
		// docs
		Doc("get payment codeURL, using this URL to generate wechat payment QRcode").
		Returns(200, "OK", nil).
		Returns(404, "Not Found", nil))

	ws.Route(ws.POST("/wechat/callback").To(u.paymentCallBack).
		// docs
		Doc("create a user"))

	return ws
}

/*
# Got a CodeURL

2022/08/16 23:13:55 status=200 resp=PrepayResponse{CodeUrl:weixin://wxpay/bizpayurl?pr=aIQrOYOzz}

# Generate it to QRcode

https://cli.im/

# Using wechat scan the code
*/
func (u Payment) getCodeURL(request *restful.Request, response *restful.Response) {
	amount := request.QueryParameter("amount")
	user := request.QueryParameter("user")
	a, err := strconv.Atoi(amount)
	if a <= 0 {
		_ = response.WriteErrorString(http.StatusBadRequest, fmt.Sprintf("error amount : %s", amount))
		return
	}
	if err != nil {
		_ = response.WriteErrorString(http.StatusBadRequest, fmt.Sprintf("error amount : %s, %v", amount, err))
		return
	}

	codeURL, err := pay.WechatPay(int64(a), user, "", "", os.Getenv(pay.NotifyCallbackURL))
	if err != nil {
		_ = response.WriteErrorString(http.StatusInternalServerError, fmt.Sprintf("payment error : %v", err))
		return
	}

	_, err = response.Write([]byte(codeURL))
	if err != nil {
		log.Print("write code url failed : ", err)
	}
	// qrterminal.Generate(codeURL, qrterminal.L, response.ResponseWriter)
	// qrterminal.Generate(codeURL, qrterminal.L, os.Stdout)
}

func (u Payment) paymentCallBack(request *restful.Request, response *restful.Response) {
	// TODO set user account balance
}

func EnrichSwaggerObject(swo *spec.Swagger) {
	swo.Info = &spec.Info{
		InfoProps: spec.InfoProps{
			Title:       "Payment service",
			Description: "Handle wechat payment",
			Contact: &spec.ContactInfo{
				ContactInfoProps: spec.ContactInfoProps{
					Name:  "fanux",
					Email: "fanux@sealos.io",
					URL:   "https://sealos.io",
				},
			},
			License: &spec.License{
				LicenseProps: spec.LicenseProps{
					Name: "Apache 2",
				},
			},
			Version: "1.0.0",
		},
	}
	swo.Tags = []spec.Tag{
		{
			TagProps: spec.TagProps{
				Name:        "payment",
				Description: "Handle wechat payment",
			},
		},
	}
}
