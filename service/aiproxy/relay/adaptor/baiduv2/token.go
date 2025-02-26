package baiduv2

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	json "github.com/json-iterator/go"
	log "github.com/sirupsen/logrus"
)

type TokenResponse struct {
	ExpireTime time.Time `json:"expireTime"`
	Token      string    `json:"token"`
}

var baiduTokenStore sync.Map

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
					_, err := getBaiduAccessTokenHelper(context.Background(), apiKey)
					if err != nil {
						log.Errorf("get baidu access token failed: %v", err)
					}
				}()
			}
			return &tokenResponse, nil
		}
	}
	tokenResponse, err := getBaiduAccessTokenHelper(ctx, apiKey)
	if err != nil {
		return nil, err
	}
	return tokenResponse, nil
}

func getBaiduAccessTokenHelper(ctx context.Context, apiKey string) (*TokenResponse, error) {
	ak, sk, err := getAKAndSK(apiKey)
	if err != nil {
		return nil, err
	}
	authorization := generateAuthorizationString(ak, sk)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://iam.bj.baidubce.com/v1/BCE-BEARER/token", nil)
	if err != nil {
		return nil, err
	}
	query := req.URL.Query()
	query.Add("expireInSeconds", "86400")
	req.URL.RawQuery = query.Encode()
	req.Header.Set("Authorization", authorization)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("get token failed, status code: %d", res.StatusCode)
	}
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
