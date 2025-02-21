package deepseek

import (
	"context"
	"errors"
	"net/http"
	"strconv"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
)

var _ adaptor.Balancer = (*Adaptor)(nil)

func (a *Adaptor) GetBalance(channel *model.Channel) (float64, error) {
	u := channel.BaseURL
	if u == "" {
		u = baseURL
	}
	url := u + "/user/balance"
	req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, url, nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("Authorization", "Bearer "+channel.Key)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	var usage UsageResponse
	if err := json.NewDecoder(resp.Body).Decode(&usage); err != nil {
		return 0, err
	}
	index := -1
	for i, balanceInfo := range usage.BalanceInfos {
		if balanceInfo.Currency == "CNY" {
			index = i
			break
		}
	}
	if index == -1 {
		return 0, errors.New("currency CNY not found")
	}
	balance, err := strconv.ParseFloat(usage.BalanceInfos[index].TotalBalance, 64)
	if err != nil {
		return 0, err
	}
	return balance, nil
}

type UsageResponse struct {
	BalanceInfos []struct {
		Currency        string `json:"currency"`
		TotalBalance    string `json:"total_balance"`
		GrantedBalance  string `json:"granted_balance"`
		ToppedUpBalance string `json:"topped_up_balance"`
	} `json:"balance_infos"`
	IsAvailable bool `json:"is_available"`
}
