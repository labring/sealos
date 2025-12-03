package query

import (
	"testing"

	"github.com/labring/sealos/service/pkg/api"
)

func TestDBLogsQuery_GetDBQuery(t *testing.T) {
	tests := []struct {
		name    string
		req     *api.VlogsDatabaseRequest
		want    string
		wantErr bool
	}{
		{
			name: "basic query with pvc only",
			req: &api.VlogsDatabaseRequest{
				Pvc: []string{"pvc-001", "pvc-002"},
			},
			want:    "{volume_uid=~'pvc-001|pvc-002'}  | limit 100 | sort by (_time) desc",
			wantErr: false,
		},
		{
			name: "query with keyword",
			req: &api.VlogsDatabaseRequest{
				Pvc:     []string{"pvc-001"},
				Keyword: "error",
			},
			want:    "{volume_uid=~'pvc-001'} *error*  | limit 100 | sort by (_time) desc",
			wantErr: false,
		},
		{
			name: "query with containers",
			req: &api.VlogsDatabaseRequest{
				Pvc:       []string{"pvc-001"},
				Container: []string{"nginx", "redis"},
			},
			want:    `{volume_uid=~'pvc-001'} container:in("nginx","redis")  | limit 100 | sort by (_time) desc`,
			wantErr: false,
		},
		{
			name: "query with log types",
			req: &api.VlogsDatabaseRequest{
				Pvc:  []string{"pvc-001"},
				Type: []string{"stdout", "stderr"},
			},
			want:    `{volume_uid=~'pvc-001'} log_type:in("stdout","stderr")  | limit 100 | sort by (_time) desc`,
			wantErr: false,
		},
		{
			name: "full query with all filters",
			req: &api.VlogsDatabaseRequest{
				Pvc:       []string{"pvc-001"},
				Keyword:   "error",
				Container: []string{"nginx"},
				Type:      []string{"stderr"},
				Time:      "2024-01-01",
				Limit:     "50",
			},
			want:    `{volume_uid=~'pvc-001'} *error* container:in("nginx") log_type:in("stderr") _time:2024-01-01 | limit 50 | sort by (_time) desc`,
			wantErr: false,
		},
		{
			name: "number mode query",
			req: &api.VlogsDatabaseRequest{
				Pvc:         []string{"pvc-001"},
				NumberMode:  modeTrue,
				NumberLevel: "h",
			},
			want:    `{volume_uid=~'pvc-001'}  | stats by (_time:1h) count() logs_total`,
			wantErr: false,
		},
		{
			name: "empty pvc list",
			req: &api.VlogsDatabaseRequest{
				Keyword: "test",
			},
			want:    "*test*  | limit 100 | sort by (_time) desc",
			wantErr: false,
		},
		{
			name: "special characters escaping",
			req: &api.VlogsDatabaseRequest{
				Pvc:     []string{"pvc'001"},
				Keyword: "it's a test",
			},
			want:    `{volume_uid=~'pvc\'001'} *it\'s a test*  | limit 100 | sort by (_time) desc`,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := &DBLogsQuery{}
			got, err := v.GetDBQuery(tt.req)
			if (err != nil) != tt.wantErr {
				t.Errorf("GetDBQuery() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("GetDBQuery() got = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestDBLogsQuery_generateVolumeUIDQuery(t *testing.T) {
	tests := []struct {
		name string
		req  *api.VlogsDatabaseRequest
		want string
	}{
		{
			name: "single pvc",
			req:  &api.VlogsDatabaseRequest{Pvc: []string{"pvc-001"}},
			want: "{volume_uid=~'pvc-001'} ",
		},
		{
			name: "multiple pvcs",
			req:  &api.VlogsDatabaseRequest{Pvc: []string{"pvc-001", "pvc-002"}},
			want: "{volume_uid=~'pvc-001|pvc-002'} ",
		},
		{
			name: "empty pvc list",
			req:  &api.VlogsDatabaseRequest{Pvc: []string{}},
			want: "",
		},
		{
			name: "pvc with special characters",
			req:  &api.VlogsDatabaseRequest{Pvc: []string{"pvc'001", "pvc\\002"}},
			want: `{volume_uid=~'pvc\'001|pvc\\002'} `,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := &DBLogsQuery{}
			v.generateVolumeUIDQuery(tt.req)
			if v.query != tt.want {
				t.Errorf("generateVolumeUIDQuery() got = %v, want %v", v.query, tt.want)
			}
		})
	}
}

func TestDBLogsQuery_generateKeywordQuery(t *testing.T) {
	tests := []struct {
		name string
		req  *api.VlogsDatabaseRequest
		want string
	}{
		{
			name: "normal keyword",
			req:  &api.VlogsDatabaseRequest{Keyword: "error"},
			want: "*error* ",
		},
		{
			name: "empty keyword",
			req:  &api.VlogsDatabaseRequest{Keyword: ""},
			want: "",
		},
		{
			name: "keyword with special characters",
			req:  &api.VlogsDatabaseRequest{Keyword: "it's error"},
			want: `*it\'s error* `,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := &DBLogsQuery{}
			v.generateKeywordQuery(tt.req)
			if v.query != tt.want {
				t.Errorf("generateKeywordQuery() got = %v, want %v", v.query, tt.want)
			}
		})
	}
}

func TestDBLogsQuery_generateContainerQuery(t *testing.T) {
	tests := []struct {
		name string
		req  *api.VlogsDatabaseRequest
		want string
	}{
		{
			name: "single container",
			req:  &api.VlogsDatabaseRequest{Container: []string{"nginx"}},
			want: `container:in("nginx") `,
		},
		{
			name: "multiple containers",
			req:  &api.VlogsDatabaseRequest{Container: []string{"nginx", "redis"}},
			want: `container:in("nginx","redis") `,
		},
		{
			name: "empty container list",
			req:  &api.VlogsDatabaseRequest{Container: []string{}},
			want: "",
		},
		{
			name: "container with special characters",
			req:  &api.VlogsDatabaseRequest{Container: []string{"nginx'test"}},
			want: `container:in("nginx\'test") `,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := &DBLogsQuery{}
			v.generateContainerQuery(tt.req)
			if v.query != tt.want {
				t.Errorf("generateContainerQuery() got = %v, want %v", v.query, tt.want)
			}
		})
	}
}

func TestDBLogsQuery_generateTypeQuery(t *testing.T) {
	tests := []struct {
		name string
		req  *api.VlogsDatabaseRequest
		want string
	}{
		{
			name: "single type",
			req:  &api.VlogsDatabaseRequest{Type: []string{"stdout"}},
			want: `log_type:in("stdout") `,
		},
		{
			name: "multiple types",
			req:  &api.VlogsDatabaseRequest{Type: []string{"stdout", "stderr"}},
			want: `log_type:in("stdout","stderr") `,
		},
		{
			name: "empty type list",
			req:  &api.VlogsDatabaseRequest{Type: []string{}},
			want: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := &DBLogsQuery{}
			v.generateTypeQuery(tt.req)
			if v.query != tt.want {
				t.Errorf("generateTypeQuery() got = %v, want %v", v.query, tt.want)
			}
		})
	}
}

func TestDBLogsQuery_generateCommonQuery(t *testing.T) {
	tests := []struct {
		name string
		req  *api.VlogsDatabaseRequest
		want string
	}{
		{
			name: "default limit",
			req:  &api.VlogsDatabaseRequest{},
			want: " | limit 100",
		},
		{
			name: "custom limit",
			req:  &api.VlogsDatabaseRequest{Limit: "50"},
			want: " | limit 50",
		},
		{
			name: "with time filter",
			req:  &api.VlogsDatabaseRequest{Time: "2024-01-01"},
			want: "_time:2024-01-01 | limit 100",
		},
		{
			name: "number mode no limit",
			req:  &api.VlogsDatabaseRequest{NumberMode: modeTrue},
			want: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := &DBLogsQuery{}
			v.generateCommonQuery(tt.req)
			if v.query != tt.want {
				t.Errorf("generateCommonQuery() got = %v, want %v", v.query, tt.want)
			}
		})
	}
}

func TestDBLogsQuery_generateNumberQuery(t *testing.T) {
	tests := []struct {
		name string
		req  *api.VlogsDatabaseRequest
		want string
	}{
		{
			name: "number mode with hour level",
			req:  &api.VlogsDatabaseRequest{NumberMode: modeTrue, NumberLevel: "h"},
			want: " | stats by (_time:1h) count() logs_total",
		},
		{
			name: "number mode with minute level",
			req:  &api.VlogsDatabaseRequest{NumberMode: modeTrue, NumberLevel: "m"},
			want: " | stats by (_time:1m) count() logs_total",
		},
		{
			name: "non-number mode",
			req:  &api.VlogsDatabaseRequest{NumberMode: "false"},
			want: "",
		},
		{
			name: "invalid level",
			req:  &api.VlogsDatabaseRequest{NumberMode: modeTrue, NumberLevel: "invalid"},
			want: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := &DBLogsQuery{}
			v.generateNumberQuery(tt.req)
			if v.query != tt.want {
				t.Errorf("generateNumberQuery() got = %v, want %v", v.query, tt.want)
			}
		})
	}
}

func TestDBLogsQuery_generateSortQuery(t *testing.T) {
	tests := []struct {
		name string
		req  *api.VlogsDatabaseRequest
		want string
	}{
		{
			name: "normal mode with sort",
			req:  &api.VlogsDatabaseRequest{},
			want: " | sort by (_time) desc",
		},
		{
			name: "number mode no sort",
			req:  &api.VlogsDatabaseRequest{NumberMode: modeTrue},
			want: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := &DBLogsQuery{}
			v.generateSortQuery(tt.req)
			if v.query != tt.want {
				t.Errorf("generateSortQuery() got = %v, want %v", v.query, tt.want)
			}
		})
	}
}
