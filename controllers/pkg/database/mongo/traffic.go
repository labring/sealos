package mongo

import (
	"context"
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

func (m *mongoDB) getTrafficBytes(sent bool, startTime, endTime time.Time, namespace string, _type uint8, name string) (int64, error) {
	filter := bson.M{
		"traffic_meta.pod_namespace": namespace,
		"traffic_meta.pod_type":      _type,
		"traffic_meta.pod_type_name": name,
		"time": bson.M{
			"$gte": startTime,
			"$lte": endTime,
		},
	}
	pipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: filter}},
		bson.D{{Key: "$group", Value: bson.D{{Key: "_id", Value: nil}, {Key: "total", Value: bson.D{{Key: "$sum", Value: "$recv_bytes"}}}}}},
	}
	if sent {
		pipeline = append(pipeline, bson.D{{Key: "$group", Value: bson.D{{Key: "_id", Value: nil}, {Key: "total", Value: bson.D{{Key: "$sum", Value: "$sent_bytes"}}}}}})
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
	return m.Client.Database(m.AuthDB).Collection(m.TrafficConn)
}
