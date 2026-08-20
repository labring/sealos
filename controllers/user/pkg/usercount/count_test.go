package usercount

import (
	"context"
	"errors"
	"testing"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type fakeMetadataReader struct {
	list *metav1.PartialObjectMetadataList
	err  error
}

func (f fakeMetadataReader) List(
	context.Context,
	metav1.ListOptions,
) (*metav1.PartialObjectMetadataList, error) {
	return f.list, f.err
}

func TestCountQuotaUsersMetadataExcluding(t *testing.T) {
	deletionTimestamp := metav1.Now()
	reader := fakeMetadataReader{
		list: &metav1.PartialObjectMetadataList{
			Items: []metav1.PartialObjectMetadata{
				{ObjectMeta: metav1.ObjectMeta{Name: "active-user"}},
				{
					ObjectMeta: metav1.ObjectMeta{
						Name:              "deleted-user",
						DeletionTimestamp: &deletionTimestamp,
					},
				},
				{ObjectMeta: metav1.ObjectMeta{Name: "excluded-user"}},
			},
		},
	}

	count, err := CountQuotaUsersMetadataExcluding(context.Background(), reader, "excluded-user")
	if err != nil {
		t.Fatalf("CountQuotaUsersMetadataExcluding() error = %v", err)
	}
	if count != 1 {
		t.Fatalf("CountQuotaUsersMetadataExcluding() = %d, want 1", count)
	}
}

func TestCountQuotaUsersMetadataErrors(t *testing.T) {
	if _, err := CountQuotaUsersMetadata(context.Background(), nil); err == nil {
		t.Fatal("CountQuotaUsersMetadata() with nil reader returned nil error")
	}

	wantErr := errors.New("list failed")
	_, err := CountQuotaUsersMetadata(context.Background(), fakeMetadataReader{err: wantErr})
	if !errors.Is(err, wantErr) {
		t.Fatalf("CountQuotaUsersMetadata() error = %v, want wrapped %v", err, wantErr)
	}
}
