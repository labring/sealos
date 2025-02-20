package openai

import (
	"context"
	"net/http"
	"time"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
)

var _ adaptor.Balancer = (*Adaptor)(nil)

func (a *Adaptor) GetBalance(channel *model.Channel) (float64, error) {
	return GetBalance(channel)
}

func GetBalance(channel *model.Channel) (float64, error) {
	u := channel.BaseURL
	if u == "" {
		u = baseURL
	}
	url := u + "/v1/dashboard/billing/subscription"

	req1, err := http.NewRequestWithContext(context.Background(), http.MethodGet, url, nil)
	if err != nil {
		return 0, err
	}
	req1.Header.Set("Authorization", "Bearer "+channel.Key)
	res1, err := http.DefaultClient.Do(req1)
	if err != nil {
		return 0, err
	}
	defer res1.Body.Close()
	subscription := SubscriptionResponse{}
	err = json.NewDecoder(res1.Body).Decode(&subscription)
	if err != nil {
		return 0, err
	}
	now := time.Now()
	startDate := now.Format("2006-01") + "-01"
	endDate := now.Format("2006-01-02")
	if !subscription.HasPaymentMethod {
		startDate = now.AddDate(0, 0, -100).Format("2006-01-02")
	}
	url = u + "/v1/dashboard/billing/usage?start_date=" + startDate + "&end_date=" + endDate
	req2, err := http.NewRequestWithContext(context.Background(), http.MethodGet, url, nil)
	if err != nil {
		return 0, err
	}
	req2.Header.Set("Authorization", "Bearer "+channel.Key)
	res2, err := http.DefaultClient.Do(req2)
	if err != nil {
		return 0, err
	}
	usage := UsageResponse{}
	err = json.NewDecoder(res2.Body).Decode(&usage)
	if err != nil {
		return 0, err
	}
	balance := subscription.HardLimitUSD - usage.TotalUsage/100
	return balance, nil
}
