package baidu

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
	log "github.com/sirupsen/logrus"
)

type AccessToken struct {
	ExpiresAt        time.Time `json:"-"`
	AccessToken      string    `json:"access_token"`
	Error            string    `json:"error,omitempty"`
	ErrorDescription string    `json:"error_description,omitempty"`
	ExpiresIn        int64     `json:"expires_in,omitempty"`
}

var baiduTokenStore sync.Map

func GetAccessToken(ctx context.Context, apiKey string) (string, error) {
	if val, ok := baiduTokenStore.Load(apiKey); ok {
		var accessToken AccessToken
		if accessToken, ok = val.(AccessToken); ok {
			// soon this will expire
			if time.Now().Add(time.Hour).After(accessToken.ExpiresAt) {
				go func() {
					_, err := getBaiduAccessTokenHelper(context.Background(), apiKey)
					if err != nil {
						log.Errorf("get baidu access token failed: %v", err)
					}
				}()
			}
			return accessToken.AccessToken, nil
		}
	}
	accessToken, err := getBaiduAccessTokenHelper(ctx, apiKey)
	if err != nil {
		log.Errorf("get baidu access token failed: %v", err)
		return "", errors.New("get baidu access token failed")
	}
	if accessToken == nil {
		return "", errors.New("get baidu access token return a nil token")
	}
	return accessToken.AccessToken, nil
}

func getBaiduAccessTokenHelper(ctx context.Context, apiKey string) (*AccessToken, error) {
	clientID, clientSecret, err := getClientIDAndSecret(apiKey)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx,
		http.MethodPost,
		fmt.Sprintf("https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=%s&client_secret=%s",
			clientID, clientSecret),
		nil)
	if err != nil {
		return nil, err
	}
	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Accept", "application/json")
	res, err := utils.DoRequest(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	var accessToken AccessToken
	err = json.NewDecoder(res.Body).Decode(&accessToken)
	if err != nil {
		return nil, err
	}
	if accessToken.Error != "" {
		return nil, errors.New(accessToken.Error + ": " + accessToken.ErrorDescription)
	}
	if accessToken.AccessToken == "" {
		return nil, errors.New("get baidu access token return empty access token")
	}
	accessToken.ExpiresAt = time.Now().Add(time.Duration(accessToken.ExpiresIn) * time.Second)
	baiduTokenStore.Store(apiKey, accessToken)
	return &accessToken, nil
}
