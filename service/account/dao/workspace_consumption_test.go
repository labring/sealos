package dao

import (
	"testing"
	"time"

	"github.com/labring/sealos/controllers/pkg/resources"
	"github.com/labring/sealos/service/account/helper"
	"go.mongodb.org/mongo-driver/bson"
)

func workspaceConsumptionRequest() helper.ConsumptionRecordReq {
	return helper.ConsumptionRecordReq{
		TimeRange: helper.TimeRange{
			StartTime: time.Date(2026, time.January, 1, 0, 0, 0, 0, time.UTC),
			EndTime:   time.Date(2026, time.January, 2, 0, 0, 0, 0, time.UTC),
		},
		Namespace: "ns-test",
		AuthBase: helper.AuthBase{
			Auth: &helper.Auth{Owner: "owner-test"},
		},
	}
}

func workspaceConsumptionStageValue(stage bson.D, key string) (any, bool) {
	for _, element := range stage {
		if element.Key == key {
			return element.Value, true
		}
	}
	return nil, false
}

func TestNormalizeWorkspaceConsumptionAppType(t *testing.T) {
	normalized, value, err := normalizeWorkspaceConsumptionAppType(" app-store ")
	if err != nil {
		t.Fatalf("normalize app type: %v", err)
	}
	if normalized != resources.AppStore {
		t.Fatalf("normalized app type = %q, want %q", normalized, resources.AppStore)
	}
	if value != resources.AppType[resources.AppStore] {
		t.Fatalf("app type value = %d, want %d", value, resources.AppType[resources.AppStore])
	}

	if _, _, err := normalizeWorkspaceConsumptionAppType("unknown"); err == nil {
		t.Fatal("expected an error for an unsupported app type")
	}
}

func TestBuildWorkspaceConsumptionPipelineWithoutAppFilter(t *testing.T) {
	pipeline, err := buildWorkspaceConsumptionPipeline(workspaceConsumptionRequest())
	if err != nil {
		t.Fatalf("build pipeline: %v", err)
	}
	if len(pipeline) != 2 {
		t.Fatalf("pipeline stage count = %d, want 2", len(pipeline))
	}

	matchValue, ok := workspaceConsumptionStageValue(pipeline[0], "$match")
	if !ok {
		t.Fatal("pipeline does not start with $match")
	}
	match, ok := matchValue.(bson.D)
	if !ok {
		t.Fatalf("$match value type = %T, want bson.D", matchValue)
	}
	for key, want := range map[string]any{
		"owner":     "owner-test",
		"namespace": "ns-test",
		"status":    resources.Settled,
	} {
		got, ok := workspaceConsumptionStageValue(match, key)
		if !ok || got != want {
			t.Errorf("$match[%q] = %#v, want %#v", key, got, want)
		}
	}

	if _, ok := workspaceConsumptionStageValue(pipeline[1], "$group"); !ok {
		t.Fatal("pipeline does not end with $group")
	}
}

func TestBuildWorkspaceConsumptionPipelineWithAppFilter(t *testing.T) {
	req := workspaceConsumptionRequest()
	req.AppType = " app "
	req.AppName = "application"

	pipeline, err := buildWorkspaceConsumptionPipeline(req)
	if err != nil {
		t.Fatalf("build pipeline: %v", err)
	}
	if len(pipeline) != 4 {
		t.Fatalf("pipeline stage count = %d, want 4", len(pipeline))
	}

	matchValue, ok := workspaceConsumptionStageValue(pipeline[0], "$match")
	if !ok {
		t.Fatal("pipeline does not start with $match")
	}
	match, ok := matchValue.(bson.D)
	if !ok {
		t.Fatalf("$match value type = %T, want bson.D", matchValue)
	}
	appType, ok := workspaceConsumptionStageValue(match, "app_type")
	if !ok || appType != resources.AppType[resources.APP] {
		t.Fatalf("$match app_type = %#v, want %d", appType, resources.AppType[resources.APP])
	}

	if _, ok := workspaceConsumptionStageValue(pipeline[1], "$facet"); ok {
		t.Fatal("app-filtered pipeline should not use $facet")
	}
	if _, ok := workspaceConsumptionStageValue(pipeline[1], "$unwind"); ok {
		t.Fatal("app-filtered pipeline should keep one row per billing record")
	}
	if _, ok := workspaceConsumptionStageValue(pipeline[2], "$match"); !ok {
		t.Fatal("app-filtered pipeline should discard zero matched amounts")
	}
}
