package vertexai

import (
	"context"
	"fmt"
	"time"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common/conv"

	credentials "cloud.google.com/go/iam/credentials/apiv1"
	"cloud.google.com/go/iam/credentials/apiv1/credentialspb"
	"github.com/patrickmn/go-cache"
	"google.golang.org/api/option"
)

type ApplicationDefaultCredentials struct {
	Type                    string `json:"type"`
	ProjectID               string `json:"project_id"`
	PrivateKeyID            string `json:"private_key_id"`
	PrivateKey              string `json:"private_key"`
	ClientEmail             string `json:"client_email"`
	ClientID                string `json:"client_id"`
	AuthURI                 string `json:"auth_uri"`
	TokenURI                string `json:"token_uri"`
	AuthProviderX509CertURL string `json:"auth_provider_x509_cert_url"`
	ClientX509CertURL       string `json:"client_x509_cert_url"`
	UniverseDomain          string `json:"universe_domain"`
}

var Cache = cache.New(50*time.Minute, 55*time.Minute)

const defaultScope = "https://www.googleapis.com/auth/cloud-platform"

func getToken(ctx context.Context, channelID int, adcJSON string) (string, error) {
	cacheKey := fmt.Sprintf("vertexai-token-%d", channelID)
	if token, found := Cache.Get(cacheKey); found {
		return token.(string), nil
	}
	adc := &ApplicationDefaultCredentials{}
	if err := json.Unmarshal(conv.StringToBytes(adcJSON), adc); err != nil {
		return "", fmt.Errorf("failed to decode credentials file: %w", err)
	}

	c, err := credentials.NewIamCredentialsClient(ctx, option.WithCredentialsJSON(conv.StringToBytes(adcJSON)))
	if err != nil {
		return "", fmt.Errorf("failed to create client: %w", err)
	}
	defer c.Close()

	req := &credentialspb.GenerateAccessTokenRequest{
		// See https://pkg.go.dev/cloud.google.com/go/iam/credentials/apiv1/credentialspb#GenerateAccessTokenRequest.
		Name:  "projects/-/serviceAccounts/" + adc.ClientEmail,
		Scope: []string{defaultScope},
	}
	resp, err := c.GenerateAccessToken(ctx, req)
	if err != nil {
		return "", fmt.Errorf("failed to generate access token: %w", err)
	}
	_ = resp

	Cache.Set(cacheKey, resp.AccessToken, cache.DefaultExpiration)
	return resp.AccessToken, nil
}
