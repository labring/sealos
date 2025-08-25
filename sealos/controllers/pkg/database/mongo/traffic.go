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
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

/* example:
{
    _id: ObjectId("60eea26373c4cdcb6356827d"),
    traffic_meta: {
        pod_name: "my-pod",
        pod_namespace: "my-namespace",
        pod_address: "100.64.0.1",
        traffic_tag: "port:80",
        pod_type: 1,
        pod_type_name: "mongodb"
    },
    timestamp: "2024-01-04T04:02:25",
    sent_bytes: 31457280,
    recv_bytes: 15728640
  }
*/

func (m *mongoDB) GetTrafficRecvBytes(startTime, endTime time.Time, namespace string, _type uint8, name string) (int64, error) {
	return m.getTrafficBytes(false, startTime, endTime, namespace, _type, name)
}

func (m *mongoDB) GetTrafficSentBytes(startTime, endTime time.Time, namespace string, _type uint8, name string) (int64, error) {
	return m.getTrafficBytes(true, startTime, endTime, namespace, _type, name)
}

func (m *mongoDB) GetPodTrafficSentBytes(startTime, endTime time.Time, namespace string, name string) (int64, error) {
	return m.getPodTrafficBytes(true, startTime, endTime, namespace, name)
}

func (m *mongoDB) GetPodTrafficRecvBytes(startTime, endTime time.Time, namespace string, name string) (int64, error) {
	return m.getPodTrafficBytes(false, startTime, endTime, namespace, name)
}

func (m *mongoDB) getPodTrafficBytes(sent bool, startTime, endTime time.Time, namespace string, name string) (int64, error) {
	filter := bson.M{
		"traffic_meta.pod_namespace": namespace,
		"traffic_meta.pod_name":      name,
		"timestamp": bson.M{
			"$gte": startTime,
			"$lt":  endTime,
		},
	}
	pipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: filter}},
	}
	if sent {
		pipeline = append(pipeline, bson.D{{Key: "$group", Value: bson.D{{Key: "_id", Value: nil}, {Key: "total", Value: bson.D{{Key: "$sum", Value: "$sent_bytes"}}}}}})
	} else {
		pipeline = append(pipeline, bson.D{{Key: "$group", Value: bson.D{{Key: "_id", Value: nil}, {Key: "total", Value: bson.D{{Key: "$sum", Value: "$recv_bytes"}}}}}})
	}
	cur, err := m.getTrafficCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return 0, err
	}
	defer cur.Close(context.Background())
	total := int64(0)
	for cur.Next(context.Background()) {
		var result struct {
			Total int64 `bson:"total"`
		}
		if err := cur.Decode(&result); err != nil {
			return 0, err
		}
		total += result.Total
	}
	return total, nil
}

func (m *mongoDB) getTrafficBytes(sent bool, startTime, endTime time.Time, namespace string, _type uint8, name string) (int64, error) {
	filter := bson.M{
		"traffic_meta.pod_namespace": namespace,
		"traffic_meta.pod_type":      _type,
		"traffic_meta.pod_type_name": name,
		"timestamp": bson.M{
			"$gte": startTime,
			"$lte": endTime,
		},
	}
	pipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: filter}},
	}
	if sent {
		pipeline = append(pipeline, bson.D{{Key: "$group", Value: bson.D{{Key: "_id", Value: nil}, {Key: "total", Value: bson.D{{Key: "$sum", Value: "$sent_bytes"}}}}}})
	} else {
		pipeline = append(pipeline, bson.D{{Key: "$group", Value: bson.D{{Key: "_id", Value: nil}, {Key: "total", Value: bson.D{{Key: "$sum", Value: "$recv_bytes"}}}}}})
	}
	cur, err := m.getTrafficCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return 0, err
	}
	defer cur.Close(context.Background())
	total := int64(0)
	for cur.Next(context.Background()) {
		var result struct {
			Total int64 `bson:"total"`
		}
		if err := cur.Decode(&result); err != nil {
			return 0, err
		}
		total += result.Total
	}
	return total, nil
}

func (m *mongoDB) getTrafficCollection() *mongo.Collection {
	return m.Client.Database(m.TrafficDB).Collection(m.TrafficConn)
}

func (m *mongoDB) GetNamespaceTraffic(ctx context.Context, startTime, endTime time.Time) (resultMap map[string]int64, err error) {
	collection := m.getTrafficCollection()
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{
			{Key: "timestamp", Value: bson.D{{Key: "$gte", Value: startTime}, {Key: "$lt", Value: endTime}}},
			{Key: "sent_bytes", Value: bson.D{{Key: "$gt", Value: 0}}},
		}}},
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: "$traffic_meta.pod_namespace"},
			{Key: "total_sent_bytes", Value: bson.D{
				{Key: "$sum", Value: "$sent_bytes"},
			}},
		}}},
	}
	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to execute aggregation: %v", err)
	}
	defer cursor.Close(ctx)
	resultMap = make(map[string]int64)
	for cursor.Next(ctx) {
		var result struct {
			Namespace      string `bson:"_id"`
			TotalSentBytes int64  `bson:"total_sent_bytes"`
		}
		if err := cursor.Decode(&result); err != nil {
			return nil, fmt.Errorf("failed to decode result: %v", err)
		}
		if strings.HasPrefix(result.Namespace, "ns-") && result.TotalSentBytes > 0 {
			resultMap[result.Namespace] = result.TotalSentBytes
		}
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate cursor: %v", err)
	}
	return resultMap, nil
}
