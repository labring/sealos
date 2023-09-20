package resources

import (
	"strings"

	"sigs.k8s.io/controller-runtime/pkg/client"
)

/*
数据库： app.kubernetes.io/instance=gitea  app.kubernetes.io/managed-by=kubeblocks apps.kubeblocks.io/component-name
应用：app: xxx
终端： TerminalID: xxx
定时任务：job-name: xxx
other: xxx
map[string][]string{}
*/

const (
	Pod = "Pod"
	PVC = "PVC"
)

const (
	DBPodLabelInstanceKey      = "app.kubernetes.io/instance"
	DBPodLabelManagedByKey     = "app.kubernetes.io/managed-by"
	DBPodLabelManagedByValue   = "kubeblocks"
	DBPodLabelComponentNameKey = "apps.kubeblocks.io/component-name"
	TerminalIDLabelKey         = "TerminalID"
	AppLabelKey                = "app"
	JobNameLabelKey            = "job-name"
)

type ResourceNamed struct {
	_name string
	// db or app or terminal or job or other
	_type string
}

func NewResourceNamed(cr client.Object) *ResourceNamed {
	p := &ResourceNamed{}
	labels := cr.GetLabels()
	switch {
	case labels[DBPodLabelComponentNameKey] != "":
		p._type = DB
		p._name = labels[DBPodLabelInstanceKey]
	case labels[TerminalIDLabelKey] != "":
		p._type = TERMINAL
		p._name = ""
	case labels[AppLabelKey] != "":
		p._type = APP
		p._name = labels[AppLabelKey]
	case labels[JobNameLabelKey] != "":
		p._type = JOB
		p._name = strings.SplitN(labels[JobNameLabelKey], "-", 2)[0]
	default:
		p._type = OTHER
		p._name = ""
	}
	return p
}

func (p *ResourceNamed) Type() uint8 {
	return MonitorType[p._type]
}

func (p *ResourceNamed) TypeString() string {
	return p._type
}

func (p *ResourceNamed) Name() string {
	return p._name
}

func (p *ResourceNamed) String() string {
	return p._type + "/" + p._name
}
