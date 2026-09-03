package dao

import (
	"testing"
	"time"

	"github.com/labring/sealos/controllers/pkg/resources"
	"github.com/labring/sealos/service/account/helper"
	"go.mongodb.org/mongo-driver/bson"
)

func consumptionRequest() helper.ConsumptionRecordReq {
	return helper.ConsumptionRecordReq{
		TimeRange: helper.TimeRange{
			StartTime: time.Date(2026, time.January, 1, 0, 0, 0, 0, time.UTC),
			EndTime:   time.Date(2026, time.January, 2, 0, 0, 0, 0, time.UTC),
		},
		AuthBase: helper.AuthBase{
			Auth: &helper.Auth{Owner: "owner-test"},
		},
	}
}

func TestBuildConsumptionAmountPipeline(t *testing.T) {
	tests := []struct {
		name    string
		request helper.ConsumptionRecordReq
	}{
		{
			name:    "all consumption",
			request: consumptionRequest(),
		},
		{
			name: "namespace and app filters",
			request: func() helper.ConsumptionRecordReq {
				req := consumptionRequest()
				req.Namespace = "ns-test"
				req.AppType = resources.APP
				req.AppName = "app-test"
				return req
			}(),
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			pipeline := buildConsumptionAmountPipeline(test.request)
			if len(pipeline) != 3 {
				t.Fatalf("pipeline stage count = %d, want 3", len(pipeline))
			}
			if _, ok := consumptionStageValue(pipeline[0], "$match"); !ok {
				t.Fatal("pipeline does not start with $match")
			}
			if _, ok := consumptionStageValue(pipeline[1], "$project"); !ok {
				t.Fatal("pipeline does not project one amount per billing record")
			}
			if _, ok := consumptionStageValue(pipeline[1], "$facet"); ok {
				t.Fatal("pipeline should not use $facet")
			}
			if _, ok := consumptionStageValue(pipeline[1], "$unwind"); ok {
				t.Fatal("pipeline should not use $unwind")
			}
			if _, ok := consumptionStageValue(pipeline[2], "$group"); !ok {
				t.Fatal("pipeline does not end with $group")
			}
		})
	}
}

func consumptionStageValue(stage bson.D, key string) (any, bool) {
	for _, element := range stage {
		if element.Key == key {
			return element.Value, true
		}
	}
	return nil, false
}
