package vertexai

import (
	"errors"
	"strings"

	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
)

var _ adaptor.KeyValidator = (*Adaptor)(nil)

func (a *Adaptor) ValidateKey(key string) error {
	_, err := getConfigFromKey(key)
	if err != nil {
		return err
	}
	return nil
}

func (a *Adaptor) KeyHelp() string {
	return "region|projectID|adcJSON"
}

// region|projectID|adcJSON
func getConfigFromKey(key string) (Config, error) {
	region, after, ok := strings.Cut(key, "|")
	if !ok {
		return Config{}, errors.New("invalid key format")
	}
	projectID, adcJSON, ok := strings.Cut(after, "|")
	if !ok {
		return Config{}, errors.New("invalid key format")
	}
	return Config{
		Region:    region,
		ProjectID: projectID,
		ADCJSON:   adcJSON,
	}, nil
}
