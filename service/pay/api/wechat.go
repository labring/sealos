package api

import (
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/emicklei/go-restful"
	"github.com/labring/sealos/pkg/pay"
)

func (u Pay) GetWechatURL(request *restful.Request, response *restful.Response) {
	amountStr := request.QueryParameter("amount")
	amount, err := strconv.ParseInt(amountStr, 10, 64)
	if err != nil {
		// process conversion error
		_ = response.WriteErrorString(http.StatusBadRequest, fmt.Sprintf("error amount : %d, %v", amount, err))
		return
	}
	user := request.QueryParameter("user")
	tradeNO := pay.GetRandomString(32)
	codeURL, err := pay.WechatPay(amount, user, tradeNO, "", "")
	if err != nil {
		_ = response.WriteErrorString(http.StatusBadRequest, fmt.Sprintf("error codeURL : %s, %v", codeURL, err))
		return
	}
	err = response.WriteEntity(codeURL)
	if err != nil {
		log.Print("write code url failed : ", err)
	}

}
