package types

type CounterType string

const (
	ImagePullCounter CounterType = "image_pull_counter"
	RepoPullCounter  CounterType = "repo_pull_counter"
	RepoStarCounter  CounterType = "repo_star_counter"
)

type GetCounterReq struct {
	Kubeconfig string      `json:"kubeconfig"`
	Ref        string      `json:"nameRef"`
	Type       CounterType `json:"type"`
}

type GetCounterReply struct {
	Counter int64 `json:"counter"`
}
