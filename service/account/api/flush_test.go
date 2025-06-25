package api_test

import (
	"context"
	"testing"

	"github.com/labring/sealos/service/account/api"
	"github.com/labring/sealos/service/account/helper"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestUpdateNamespaceStatus(t *testing.T) {
	tests := []struct {
		name       string
		namespaces []string
		annoKey    string
		status     string
		setupNs    func() *corev1.Namespace
		wantErr    bool
	}{
		{
			name:       "update debt status successfully",
			namespaces: []string{"test-ns"},
			annoKey:    api.DebtNamespaceAnnoStatusKey,
			status:     api.SuspendDebtNamespaceAnnoStatus,
			setupNs: func() *corev1.Namespace {
				return &corev1.Namespace{
					ObjectMeta: metav1.ObjectMeta{
						Name:        "test-ns",
						Annotations: map[string]string{},
					},
				}
			},
			wantErr: false,
		},
		{
			name:       "update network status successfully",
			namespaces: []string{"test-ns"},
			annoKey:    api.NetworkStatusAnnoKey,
			status:     api.SuspendNetworkNamespaceAnnoStatus,
			setupNs: func() *corev1.Namespace {
				return &corev1.Namespace{
					ObjectMeta: metav1.ObjectMeta{
						Name:        "test-ns",
						Annotations: map[string]string{},
					},
				}
			},
			wantErr: false,
		},
		{
			name:       "skip update when status is same",
			namespaces: []string{"test-ns"},
			annoKey:    api.DebtNamespaceAnnoStatusKey,
			status:     api.SuspendDebtNamespaceAnnoStatus,
			setupNs: func() *corev1.Namespace {
				return &corev1.Namespace{
					ObjectMeta: metav1.ObjectMeta{
						Name: "test-ns",
						Annotations: map[string]string{
							api.DebtNamespaceAnnoStatusKey: api.SuspendDebtNamespaceAnnoStatus,
						},
					},
				}
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ns := tt.setupNs()
			fakeClient := fake.NewClientBuilder().WithObjects(ns).Build()

			err := api.UpdateNamespaceStatus(context.Background(), fakeClient, tt.annoKey, tt.status, tt.namespaces)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)

				// Verify the namespace was updated correctly
				updatedNs := &corev1.Namespace{}
				err = fakeClient.Get(context.Background(), client.ObjectKey{Name: tt.namespaces[0]}, updatedNs)
				assert.NoError(t, err)
				assert.Equal(t, tt.status, updatedNs.Annotations[tt.annoKey])
			}
		})
	}
}

func TestFlushUserDebtResourceStatus(t *testing.T) {
	tests := []struct {
		name       string
		req        *helper.AdminFlushDebtResourceStatusReq
		namespaces []string
		setupNs    func() *corev1.Namespace
		wantErr    bool
		wantStatus string
	}{
		{
			name: "normal to debt period",
			req: &helper.AdminFlushDebtResourceStatusReq{
				LastDebtStatus:    types.NormalPeriod,
				CurrentDebtStatus: types.DebtPeriod,
				IsBasicUser:      true,
			},
			namespaces: []string{"test-ns"},
			setupNs: func() *corev1.Namespace {
				return &corev1.Namespace{
					ObjectMeta: metav1.ObjectMeta{
						Name:        "test-ns",
						Annotations: map[string]string{},
					},
				}
			},
			wantErr:    false,
			wantStatus: api.SuspendDebtNamespaceAnnoStatus,
		},
		{
			name: "debt to normal period",
			req: &helper.AdminFlushDebtResourceStatusReq{
				LastDebtStatus:    types.DebtPeriod,
				CurrentDebtStatus: types.NormalPeriod,
				IsBasicUser:      true,
			},
			namespaces: []string{"test-ns"},
			setupNs: func() *corev1.Namespace {
				return &corev1.Namespace{
					ObjectMeta: metav1.ObjectMeta{
						Name:        "test-ns",
						Annotations: map[string]string{},
					},
				}
			},
			wantErr:    false,
			wantStatus: api.ResumeDebtNamespaceAnnoStatus,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ns := tt.setupNs()
			fakeClient := fake.NewClientBuilder().WithObjects(ns).Build()

			err := api.FlushUserDebtResourceStatus(tt.req, fakeClient, tt.namespaces)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)

				// Verify the namespace status was updated correctly
				updatedNs := &corev1.Namespace{}
				err = fakeClient.Get(context.Background(), client.ObjectKey{Name: tt.namespaces[0]}, updatedNs)
				assert.NoError(t, err)
				assert.Equal(t, tt.wantStatus, updatedNs.Annotations[api.DebtNamespaceAnnoStatusKey])
			}
		})
	}
}
