package doubaoaudio

import (
	"errors"
	"strings"

	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
)

var _ adaptor.KeyValidator = (*Adaptor)(nil)

func (a *Adaptor) ValidateKey(key string) error {
	_, _, err := getAppIDAndToken(key)
	return err
}

func (a *Adaptor) KeyHelp() string {
	return "app_id|app_token"
}

// key格式: app_id|app_token
func getAppIDAndToken(key string) (string, string, error) {
	parts := strings.Split(key, "|")
	if len(parts) != 2 {
		return "", "", errors.New("invalid key format")
	}
	return parts[0], parts[1], nil
}
