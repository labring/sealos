package api

import (
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/emicklei/go-restful"
	"github.com/labring/sealos/pkg/pay"
)

func (u Pay) GetStripeURL(request *restful.Request, response *restful.Response) {
	amountStr := request.QueryParameter("amount")
	amount, err := strconv.ParseInt(amountStr, 10, 64)
	if err != nil {
		// process conversion error
		_ = response.WriteErrorString(http.StatusBadRequest, fmt.Sprintf("error amount : %d, %v", amount, err))
		return
	}

	session, err := pay.CreateCheckoutSession(amount, pay.CNY, pay.DefaultSuccessURL, pay.DefaultSuccessURL)
	if err != nil {
		_ = response.WriteErrorString(http.StatusBadRequest, fmt.Sprintf("error session : %v", err))
		return
	}
	err = response.WriteEntity(session.ID)
	if err != nil {
		log.Print("write sessionID failed : ", err)
	}
}
