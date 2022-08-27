package aws

import v1 "github.com/labring/sealos/controllers/infra/api/v1"

type Price struct {
}

// QueryPrice query infra price/hour
func (pReq Price) QueryPrice(infra *v1.Infra) (int64, error) {
	//TODO implement me
	panic("implement me")
}
