package region

type Region struct {
	Id       string
	Endpoint string
}

func NewRegion(id string, endpoint string) *Region {
	return &Region{
		Id:       id,
		Endpoint: endpoint,
	}
}

func (r *Region) WithEndpointOverride(endpoint string) *Region {
	r.Endpoint = endpoint
	return r
}
