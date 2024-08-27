package label

type Recommended struct {
	Name      string
	Instance  string
	Version   string
	Component string
	PartOf    string
	ManagedBy string
}

const (
	AppName      AppKey = "app.kubernetes.io/name"
	AppInstance  AppKey = "app.kubernetes.io/instance"
	AppVersion   AppKey = "app.kubernetes.io/version"
	AppComponent AppKey = "app.kubernetes.io/component"
	AppPartOf    AppKey = "app.kubernetes.io/part-of"
	AppManagedBy AppKey = "app.kubernetes.io/managed-by"
)

type AppKey = string

const (
	DefaultManagedBy = "sealos"
)

func (r *Recommended) Labels() map[string]string {
	ret := map[string]string{}

	if r.Name != "" {
		ret[AppName] = r.Name
	}
	if r.Instance != "" {
		ret[AppInstance] = r.Instance
	}
	if r.Version != "" {
		ret[AppVersion] = r.Version
	}
	if r.Component != "" {
		ret[AppComponent] = r.Component
	}
	if r.PartOf != "" {
		ret[AppPartOf] = r.PartOf
	}
	if r.ManagedBy != "" {
		ret[AppManagedBy] = r.ManagedBy
	}

	return ret
}

func RecommendedLabels(r *Recommended) map[string]string {
	return r.Labels()
}
