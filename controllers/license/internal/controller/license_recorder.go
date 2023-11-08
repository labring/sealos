// Copyright © 2023 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
	if err != nil && errors.Is(err, mongo.ErrNoDocuments) {
		return false, nil
	} else if err != nil {
		return false, err
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
	m, err := meta.New(license)
	if err != nil {
		return err
	}
	return r.db.StoreLicenseMeta(ctx, m)
}
