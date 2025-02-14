package minimax

import (
	"errors"
	"strings"

	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
)

var _ adaptor.KeyValidator = (*Adaptor)(nil)

func (a *Adaptor) ValidateKey(key string) error {
	_, _, err := GetAPIKeyAndGroupID(key)
	if err != nil {
		return err
	}
	return nil
}

func (a *Adaptor) KeyHelp() string {
	return "api_key|group_id"
}

func GetAPIKeyAndGroupID(key string) (string, string, error) {
	keys := strings.Split(key, "|")
	if len(keys) != 2 {
		return "", "", errors.New("invalid key format")
	}
	return keys[0], keys[1], nil
}
