package net

type Flannel struct {
	metadata MetaData
}

func (Flannel) Manifests(template string) string {
	return ""
}

func (Flannel) Template() string {
	return ""
}
