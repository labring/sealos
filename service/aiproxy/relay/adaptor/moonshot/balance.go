package moonshot

import (
	"context"
	"fmt"
	"net/http"

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
	url := u + "/v1/users/me/balance"
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

	var response BalanceResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return 0, err
	}

	if response.Error != nil {
		return 0, fmt.Errorf("type: %s, message: %s", response.Error.Type, response.Error.Message)
	}

	return response.Data.AvailableBalance, nil
}

type BalanceResponse struct {
	Error *BalanceError `json:"error"`
	Data  BalanceData   `json:"data"`
}

type BalanceData struct {
	AvailableBalance float64 `json:"available_balance"`
}

type BalanceError struct {
	Message string `json:"message"`
	Type    string `json:"type"`
}
