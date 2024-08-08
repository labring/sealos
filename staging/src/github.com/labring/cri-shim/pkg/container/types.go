package container

type Env struct {
	Key   string `json:"key"`
	Value string `json:"value,omitempty"`
}

type Config struct {
	Envs []Env `json:"envs"`
}

type Info struct {
	Config Config `json:"config"`
}
