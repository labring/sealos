package cloud

type TencentProvider struct {
	Config
}

func (t *TencentProvider) Create(request Request) (*Response, error) {
	panic("implement me")
}

func (t *TencentProvider) Delete(...string) error {
	panic("implement me")
}
