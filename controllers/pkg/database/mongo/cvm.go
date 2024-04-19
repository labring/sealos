// Copyright © 2024 sealos.
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

package mongo

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/labring/sealos/controllers/pkg/types"
)

func (m *mongoDB) GetPendingStateInstance(regionUID string) (ecs []types.CVMBilling, err error) {
	if regionUID == "" {
		return nil, fmt.Errorf("region UID is empty")
	}
	filter := bson.M{
		"state": bson.M{
			"$eq": types.CVMBillingStatePending,
		},
		"sealosRegionUid": bson.M{
			"$eq": regionUID,
		},
	}
	cur, err := m.getCVMCollection().Find(context.Background(), filter)
	if err != nil {
		return nil, fmt.Errorf("failed to find with filter: %v", err)
	}
	defer cur.Close(context.Background())
	ecs = make([]types.CVMBilling, 0)
	err = cur.All(context.Background(), &ecs)
	if err != nil {
		return nil, err
	}
	return ecs, nil
}

func (m *mongoDB) SetDoneStateInstance(instanceID primitive.ObjectID) error {
	filter := bson.M{
		"_id": bson.M{
			"$eq": instanceID,
		},
	}
	update := bson.M{
		"$set": bson.M{
			"state": types.CVMBillingStateDone,
		},
	}
	_, err := m.getCVMCollection().UpdateOne(context.Background(), filter, update)
	if err != nil {
		return fmt.Errorf("failed to update with filter: %v", err)
	}
	return nil
}

func (m *mongoDB) getCVMCollection() *mongo.Collection {
	return m.Client.Database(m.CvmDB).Collection(m.CvmConn)
}
