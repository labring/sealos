package finalizer

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

type mockObject struct {
	client.Object
	metav1.ObjectMeta
	finalizers []string
}

func (m *mockObject) GetFinalizers() []string {
	return m.finalizers
}

func (m *mockObject) SetFinalizers(finalizers []string) {
	m.finalizers = finalizers
}

func (m *mockObject) GetObjectKind() schema.ObjectKind {
	return &schema.GroupVersionKind{
		Group:   "test.sealos.io",
		Version: "v1",
		Kind:    "Test",
	}
}

func TestNewFinalizer(t *testing.T) {
	client := fake.NewClientBuilder().Build()
	f := NewFinalizer(client, "test-finalizer")

	assert.NotNil(t, f)
	assert.Equal(t, "test-finalizer", f.finalizerName)
}

func TestFinalizer_AddFinalizer(t *testing.T) {
	tests := []struct {
		name           string
		obj            *mockObject
		expectedResult bool
		expectError    bool
	}{
		{
			name: "add finalizer to object without deletion timestamp",
			obj: &mockObject{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test",
					Namespace: "default",
				},
			},
			expectedResult: true,
			expectError:    false,
		},
		{
			name: "object with deletion timestamp",
			obj: &mockObject{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "test",
					Namespace:         "default",
					DeletionTimestamp: &metav1.Time{Time: time.Now()},
				},
			},
			expectedResult: false,
			expectError:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			scheme := runtime.NewScheme()
			client := fake.NewClientBuilder().WithScheme(scheme).Build()
			f := NewFinalizer(client, "test-finalizer")

			result, err := f.AddFinalizer(context.Background(), tt.obj)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
			assert.Equal(t, tt.expectedResult, result)
		})
	}
}

func TestFinalizer_RemoveFinalizer(t *testing.T) {
	tests := []struct {
		name           string
		obj            *mockObject
		fun            func(context.Context, client.Object) error
		expectedResult bool
		expectError    bool
	}{
		{
			name: "remove finalizer from object with deletion timestamp",
			obj: &mockObject{
				ObjectMeta: metav1.ObjectMeta{
					Name:              "test",
					Namespace:         "default",
					DeletionTimestamp: &metav1.Time{Time: time.Now()},
				},
				finalizers: []string{"test-finalizer"},
			},
			fun:            DefaultFunc,
			expectedResult: true,
			expectError:    false,
		},
		{
			name: "object without deletion timestamp",
			obj: &mockObject{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test",
					Namespace: "default",
				},
				finalizers: []string{"test-finalizer"},
			},
			fun:            DefaultFunc,
			expectedResult: false,
			expectError:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			scheme := runtime.NewScheme()
			client := fake.NewClientBuilder().WithScheme(scheme).Build()
			f := NewFinalizer(client, "test-finalizer")

			result, err := f.RemoveFinalizer(context.Background(), tt.obj, tt.fun)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
			assert.Equal(t, tt.expectedResult, result)
		})
	}
}

func TestFinalizer_updateFinalizers(t *testing.T) {
	tests := []struct {
		name        string
		obj         *unstructured.Unstructured
		finalizers  []string
		expectError bool
	}{
		{
			name: "update finalizers successfully",
			obj: &unstructured.Unstructured{
				Object: map[string]interface{}{
					"apiVersion": "test.sealos.io/v1",
					"kind":       "Test",
					"metadata": map[string]interface{}{
						"name":      "test",
						"namespace": "default",
					},
				},
			},
			finalizers:  []string{"test-finalizer"},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			scheme := runtime.NewScheme()
			client := fake.NewClientBuilder().WithScheme(scheme).WithObjects(tt.obj).Build()
			f := NewFinalizer(client, "test-finalizer")

			err := f.updateFinalizers(context.Background(), client.ObjectKey{Name: tt.obj.GetName(), Namespace: tt.obj.GetNamespace()}, tt.obj, tt.finalizers)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
