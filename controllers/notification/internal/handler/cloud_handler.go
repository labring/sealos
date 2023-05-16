package handler

import (
	"errors"

	ntf "github.com/labring/sealos/controllers/common/notification/api/v1"
	cloudclient "github.com/labring/sealos/controllers/notification/internal/cloudclient"
	"github.com/labring/sealos/pkg/utils/logger"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	Group   string = "notification.sealos.io"
	Version string = "v1"
	Kind    string = "Notification"
)

type CloudHandler struct {
	CloudText      *cloudclient.CloudText
	Notification   ntf.Notification
	NamespacedName types.NamespacedName
	Client         *client.Client
}

func (handler *CloudHandler) BuildCloudCR() error {

	if handler.Client == nil {
		logger.Error("The CloudHandler is not initialized!")
		return errors.New("the CloudHandler is not initialized")
	}

	handler.SpecCopy()
	handler.NamespacedName = types.NamespacedName{Namespace: "cloud-notification", Name: handler.CloudText.ID}
	handler.Notification.SetNamespace(handler.NamespacedName.Namespace)
	handler.Notification.SetName(handler.NamespacedName.Name)
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
		Notification:   ntf.Notification{},
		NamespacedName: types.NamespacedName{}}
}
