package registry

type repositoriesResponse struct {
	Repositories []string `json:"repositories"`
}

func (registry *Registry) Repositories(filterFunc func(data []string) []string) ([]string, error) {
	url := "/v2/_catalog?n=50"

	repos := make([]string, 0, 10)
	var err error //We create this here, otherwise url will be rescoped with :=
	var response repositoriesResponse
	//var last string
	for {
		registry.Logf("registry.repositories url=%s", url)
		url, err = registry.getPaginatedJSON(url, &response)
		switch err {
		case ErrNoMorePages:
			repos = append(repos, filterFunc(response.Repositories)...)
			return repos, nil
		case nil:
			repos = append(repos, filterFunc(response.Repositories)...)
			continue
		default:
			return nil, err
		}
	}
}
