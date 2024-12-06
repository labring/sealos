package baidu

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common/client"
)

type AccessToken struct {
	ExpiresAt        time.Time `json:"-"`
	AccessToken      string    `json:"access_token"`
	Error            string    `json:"error,omitempty"`
	ErrorDescription string    `json:"error_description,omitempty"`
	ExpiresIn        int64     `json:"expires_in,omitempty"`
}

type TokenResponse struct {
	ExpireTime time.Time `json:"expireTime"`
	Token      string    `json:"token"`
}

var baiduTokenStore sync.Map

func GetAccessToken(ctx context.Context, apiKey string) (string, error) {
	if val, ok := baiduTokenStore.Load(apiKey); ok {
		var accessToken AccessToken
		if accessToken, ok = val.(AccessToken); ok {
			// soon this will expire
			if time.Now().Add(time.Hour).After(accessToken.ExpiresAt) {
				go func() {
					_, _ = getBaiduAccessTokenHelper(context.Background(), apiKey)
				}()
			}
			return accessToken.AccessToken, nil
		}
	}
	accessToken, err := getBaiduAccessTokenHelper(ctx, apiKey)
	if err != nil {
		return "", errors.New("get baidu access token failed")
	}
	if accessToken == nil {
		return "", errors.New("get baidu access token return a nil token")
	}
	return accessToken.AccessToken, nil
}

func getBaiduAccessTokenHelper(ctx context.Context, apiKey string) (*AccessToken, error) {
	parts := strings.Split(apiKey, "|")
	if len(parts) != 2 {
		return nil, errors.New("invalid baidu apikey")
	}
	req, err := http.NewRequestWithContext(ctx,
		http.MethodPost,
		fmt.Sprintf("https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=%s&client_secret=%s",
			parts[0], parts[1]),
		nil)
	if err != nil {
		return nil, err
	}
	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Accept", "application/json")
	res, err := client.ImpatientHTTPClient.Do(req)
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

func GetBearerToken(ctx context.Context, apiKey string) (*TokenResponse, error) {
	parts := strings.Split(apiKey, "|")
	if len(parts) != 2 {
		return nil, errors.New("invalid baidu apikey")
	}
	if val, ok := baiduTokenStore.Load("bearer|" + apiKey); ok {
		var tokenResponse TokenResponse
		if tokenResponse, ok = val.(TokenResponse); ok {
			if time.Now().Add(time.Hour).After(tokenResponse.ExpireTime) {
				go func() {
					_, _ = GetBearerToken(context.Background(), apiKey)
				}()
			}
			return &tokenResponse, nil
		}
	}
	authorization := generateAuthorizationString(parts[0], parts[1])
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://iam.bj.baidubce.com/v1/BCE-BEARER/token", nil)
	if err != nil {
		return nil, err
	}
	query := url.Values{}
	query.Add("expireInSeconds", "86400")
	req.URL.RawQuery = query.Encode()
	req.Header.Add("Authorization", authorization)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	var tokenResponse TokenResponse
	err = json.NewDecoder(res.Body).Decode(&tokenResponse)
	if err != nil {
		return nil, err
	}
	baiduTokenStore.Store("bearer|"+apiKey, tokenResponse)
	return &tokenResponse, nil
}

func generateAuthorizationString(ak, sk string) string {
	httpMethod := http.MethodGet
	uri := "/v1/BCE-BEARER/token"
	queryString := "expireInSeconds=86400"
	hostHeader := "iam.bj.baidubce.com"
	canonicalRequest := fmt.Sprintf("%s\n%s\n%s\nhost:%s", httpMethod, uri, queryString, hostHeader)

	timestamp := time.Now().UTC().Format("2006-01-02T15:04:05Z")
	expirationPeriodInSeconds := 1800
	authStringPrefix := fmt.Sprintf("bce-auth-v1/%s/%s/%d", ak, timestamp, expirationPeriodInSeconds)

	signingKey := hmacSHA256(sk, authStringPrefix)

	signature := hmacSHA256(signingKey, canonicalRequest)

	signedHeaders := "host"
	authorization := fmt.Sprintf("%s/%s/%s", authStringPrefix, signedHeaders, signature)

	return authorization
}

func hmacSHA256(key, data string) string {
	h := hmac.New(sha256.New, []byte(key))
	h.Write([]byte(data))
	return hex.EncodeToString(h.Sum(nil))
}
