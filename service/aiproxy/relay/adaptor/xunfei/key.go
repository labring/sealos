package xunfei

import (
	"errors"
	"strings"

	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
)

var _ adaptor.KeyValidator = (*Adaptor)(nil)

func (a *Adaptor) ValidateKey(key string) error {
	if strings.Contains(key, ":") {
		return nil
	}
	return errors.New("invalid key format")
}

func (a *Adaptor) KeyHelp() string {
	return "xxx:xxx"
}
