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
		name       string
		request    helper.ConsumptionRecordReq
		stageCount int
		projectAt  int
		groupAt    int
	}{
		{
			name:       "all consumption",
			request:    consumptionRequest(),
			stageCount: 2,
			groupAt:    1,
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
			stageCount: 4,
			projectAt:  1,
			groupAt:    3,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			pipeline := buildConsumptionAmountPipeline(test.request)
			if len(pipeline) != test.stageCount {
				t.Fatalf("pipeline stage count = %d, want %d", len(pipeline), test.stageCount)
			}
			if !hasConsumptionStage(pipeline[0], "$match") {
				t.Fatal("pipeline does not start with $match")
			}
			if test.projectAt > 0 {
				if !hasConsumptionStage(pipeline[test.projectAt], "$project") {
					t.Fatal("pipeline does not project one amount per billing record")
				}
				if hasConsumptionStage(pipeline[test.projectAt], "$facet") ||
					hasConsumptionStage(pipeline[test.projectAt], "$unwind") {
					t.Fatal("pipeline should not use $facet or $unwind")
				}
			}
			if !hasConsumptionStage(pipeline[test.groupAt], "$group") {
				t.Fatal("pipeline does not end with $group")
			}
		})
	}
}

func hasConsumptionStage(stage bson.D, key string) bool {
	for _, element := range stage {
		if element.Key == key {
			return true
		}
	}
	return false
}
