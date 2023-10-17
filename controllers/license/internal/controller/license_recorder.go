package controller

import (
	"context"
	"errors"
	v1 "github.com/labring/sealos/controllers/license/api/v1"
	"github.com/labring/sealos/controllers/license/internal/util/database"
	"github.com/labring/sealos/controllers/license/internal/util/meta"
	"go.mongodb.org/mongo-driver/mongo"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type LicenseRecorder struct {
	// maybe you need more or less information to record license, add/delete if you need
	client.Client
	db *database.DataBase
}

func (r *LicenseRecorder) Get(ctx context.Context, license *v1.License) (*meta.Meta, error) {
	m, err := r.db.GetLicenseMeta(ctx, license.Spec.Token)
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (r *LicenseRecorder) Find(ctx context.Context, license *v1.License) (bool, error) {
	_, err := r.Get(ctx, license)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return false, nil
		} else {
			return false, err
		}
	}
	return true, nil
}

func (r *LicenseRecorder) IsExisted(ctx context.Context, license *v1.License) (bool, error) {
	_, err := r.Get(ctx, license)
	if err != nil {
		return false, err
	}
	// TODO implement this
	return true, nil
}

func (r *LicenseRecorder) Store(ctx context.Context, license *v1.License) error {
	return r.db.StoreLicenseMeta(ctx, meta.New(license))
}
