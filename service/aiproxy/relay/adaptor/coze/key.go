package coze

import (
	"errors"
	"strings"

	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
)

var _ adaptor.KeyValidator = (*Adaptor)(nil)

func (a *Adaptor) ValidateKey(key string) error {
	_, _, err := getTokenAndUserID(key)
	if err != nil {
		return err
	}
	return nil
}

func (a *Adaptor) KeyHelp() string {
	return "token|user_id"
}

func getTokenAndUserID(key string) (string, string, error) {
	split := strings.Split(key, "|")
	if len(split) != 2 {
		return "", "", errors.New("invalid key format")
	}
	return split[0], split[1], nil
}
