package v1

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

func TestUser_Default(t *testing.T) {
	tests := []struct {
		name    string
		obj     runtime.Object
		wantErr bool
	}{
		{
			name: "valid user",
			obj: &User{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test-user",
				},
				Spec: UserSpec{},
			},
			wantErr: false,
		},
		{
			name:    "invalid object type",
			obj:     &metav1.ObjectMeta{},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &User{}
			err := r.Default(context.Background(), tt.obj)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)

			user := tt.obj.(*User)
			assert.Equal(t, int64(7200), user.Spec.CSRExpirationSeconds)
			assert.NotEmpty(t, user.Annotations)
			assert.NotEmpty(t, user.Labels)
		})
	}
}

func TestUser_ValidateCreate(t *testing.T) {
	tests := []struct {
		name    string
		obj     runtime.Object
		wantErr bool
	}{
		{
			name: "valid user",
			obj: &User{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test-user",
					Annotations: map[string]string{
						UserAnnotationDisplayKey: "display",
					},
				},
				Spec: UserSpec{
					CSRExpirationSeconds: 7200,
				},
			},
			wantErr: false,
		},
		{
			name:    "invalid object type",
			obj:     &metav1.ObjectMeta{},
			wantErr: true,
		},
		{
			name: "missing display annotation",
			obj: &User{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test-user",
				},
				Spec: UserSpec{
					CSRExpirationSeconds: 7200,
				},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &User{}
			warnings, err := r.ValidateCreate(context.Background(), tt.obj)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			assert.Empty(t, warnings)
		})
	}
}

func TestUser_ValidateUpdate(t *testing.T) {
	tests := []struct {
		name    string
		old     runtime.Object
		new     runtime.Object
		wantErr bool
	}{
		{
			name: "valid update",
			old: &User{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test-user",
					Annotations: map[string]string{
						UserAnnotationDisplayKey: "display",
					},
				},
			},
			new: &User{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test-user",
					Annotations: map[string]string{
						UserAnnotationDisplayKey: "new-display",
					},
				},
				Spec: UserSpec{
					CSRExpirationSeconds: 7200,
				},
			},
			wantErr: false,
		},
		{
			name:    "invalid object type",
			old:     &User{},
			new:     &metav1.ObjectMeta{},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &User{}
			warnings, err := r.ValidateUpdate(context.Background(), tt.old, tt.new)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			assert.Empty(t, warnings)
		})
	}
}

func TestUser_ValidateDelete(t *testing.T) {
	tests := []struct {
		name    string
		obj     runtime.Object
		wantErr bool
	}{
		{
			name: "valid delete",
			obj: &User{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test-user",
					Annotations: map[string]string{
						UserAnnotationDisplayKey: "display",
					},
				},
			},
			wantErr: false,
		},
		{
			name:    "invalid object type",
			obj:     &metav1.ObjectMeta{},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &User{}
			warnings, err := r.ValidateDelete(context.Background(), tt.obj)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			assert.Empty(t, warnings)
		})
	}
}

func TestUser_SetupWebhookWithManager(t *testing.T) {
	r := &User{}
	mgr := &mockManager{}
	err := r.SetupWebhookWithManager(mgr)
	assert.NoError(t, err)
}

type mockManager struct {
	ctrl.Manager
}
