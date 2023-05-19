package handler

import (
	"errors"

	ntf "github.com/labring/sealos/controllers/common/notification/api/v1"
	cloudclient "github.com/labring/sealos/controllers/notification/internal/cloudclient"
	"github.com/labring/sealos/pkg/utils/logger"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
)

const (
	Group   string = "notification.sealos.io"
	Version string = "v1"
	Kind    string = "Notification"
)

type CloudHandler struct {
	CloudText      *cloudclient.CloudText
	Notification   *ntf.Notification
	NamespacedName types.NamespacedName
}

func (handler *CloudHandler) Init(cloudtext *cloudclient.CloudText, notification *ntf.Notification) {
	handler.CloudText = cloudtext
	handler.Notification = notification
}

func (handler *CloudHandler) Reset() {
	handler.CloudText = nil
	handler.Notification = nil
}

func (handler *CloudHandler) BuildCloudCR() error {
	if handler.CloudText == nil || handler.Notification == nil {
		logger.Info("CloudHandler haven't been initialized")
		return errors.New("cloudhandler haven't been initialized")
	}
	// spec
	handler.SpecCopy()
	// metadata
	handler.NamespacedName = types.NamespacedName{Namespace: "system-notification", Name: handler.CloudText.ID}
	handler.Notification.SetNamespace(handler.NamespacedName.Namespace)
	handler.Notification.SetName(handler.NamespacedName.Name)
	// gvk
	handler.Notification.SetGroupVersionKind(schema.GroupVersionKind{Group: Group, Kind: Kind, Version: Version})

	return nil
}

func (handler *CloudHandler) SpecCopy() {
	handler.Notification.Spec.From = "Laf Cloud"
	handler.Notification.Spec.Message = handler.CloudText.Message
	handler.Notification.Spec.Title = handler.CloudText.Title
	handler.Notification.Spec.Timestamp = handler.CloudText.Timestamp
	handler.Notification.Spec.Importance = handler.CloudText.Importance
}

func NewCloudHandler() *CloudHandler {
	//init handler
	return &CloudHandler{CloudText: nil,
		Notification:   nil,
		NamespacedName: types.NamespacedName{}}
}
