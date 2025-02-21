package aws

import (
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/aws/utils"
)

var _ adaptor.KeyValidator = (*Adaptor)(nil)

func (a *Adaptor) ValidateKey(key string) error {
	_, err := utils.GetAwsConfigFromKey(key)
	if err != nil {
		return err
	}
	return nil
}

func (a *Adaptor) KeyHelp() string {
	return "region|ak|sk"
}
