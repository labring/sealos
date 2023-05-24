package handler

import (
	"context"
	"errors"
	"strings"

	cloudclient "github.com/labring/sealos/controllers/cloud/internal/cloudclient"
	ntf "github.com/labring/sealos/controllers/common/notification/api/v1"
	"github.com/labring/sealos/pkg/utils/logger"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type handlerFunc func(ntf *ntf.Notification, namespaceName string)

const (
	Group   string = "notification.sealos.io"
	Version string = "v1"
	Kind    string = "Notification"
)

type CloudHandler struct {
	Client client.Client
	//single
	Input *cloudclient.CloudText
	//maybe multiple
	Output []ntf.Notification
}

func (h *CloudHandler) Reset() {
	h.Input = nil
	h.Output = nil
}

func (h *CloudHandler) BuildCloudCR() error {
	if h.Input == nil || h.Output == nil {
		logger.Info("failed to initialize the Cloud Handler")
		return errors.New("failed to initialize the Cloud Handler")
	}
	// spec
	var baseNtf ntf.Notification
	h.specCopy(&baseNtf)
	// get namespaces from cluster
	namespaceList := &corev1.NamespaceList{}
	if err := h.Client.List(context.Background(), namespaceList); err != nil {
		logger.Error("failed to get namespace resource ", err)
		return err
	}
	//divide namespace to diff groups
	var namespaceGroup = map[string][]string{
		"ns":   {},
		"adm":  {},
		"root": {},
	}
	for _, namespace := range namespaceList.Items {
		for prefix := range namespaceGroup {
			if strings.HasPrefix(namespace.Name, prefix) {
				namespaceGroup[prefix] = append(namespaceGroup[prefix], namespace.Name)
				break
			}
		}
	}
	//add namespace & name to CR
	var handlerMap = map[string]handlerFunc{
		"ns":   h.processNS,
		"adm":  h.processADM,
		"root": h.processROOT,
	}
	for prefix, namespaces := range namespaceGroup {
		handler := handlerMap[prefix]
		for _, namespace := range namespaces {
			Ntf := baseNtf
			handler(&Ntf, namespace)
			h.Output = append(h.Output, Ntf)
		}
	}
	return nil
}

func (h *CloudHandler) specCopy(notification *ntf.Notification) {
	notification.Spec.From = "Cloud"
	notification.Spec.Message = h.Input.Message
	notification.Spec.Title = h.Input.Title
	notification.Spec.Timestamp = h.Input.Timestamp
	notification.Spec.Importance = h.Input.Importance
}

func NewCloudHandler() *CloudHandler {
	//init handler
	return &CloudHandler{Input: nil, Output: nil}
}

func (h *CloudHandler) buildCloudCR(notification *ntf.Notification, namespace string) {
	prefix := "ntf-"
	//crd
	notification.SetGroupVersionKind(schema.GroupVersionKind{Group: Group, Kind: Kind, Version: Version})
	//metadata
	notification.Namespace = namespace
	notification.Name = prefix + h.Input.ID
}

func (h *CloudHandler) processNS(Ntf *ntf.Notification, namespaceName string) {
	h.buildCloudCR(Ntf, namespaceName)
}
func (h *CloudHandler) processADM(_ *ntf.Notification, namespaceName string) {
	logger.Info("no logic for adm-user")
}
func (h *CloudHandler) processROOT(_ *ntf.Notification, namespaceName string) {
	logger.Info("no logic for root-user")
}
