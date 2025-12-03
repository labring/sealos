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
			want:    `{volume_uid=~'pvc-001'} container:in('nginx','redis')  | limit 100 | sort by (_time) desc`,
			wantErr: false,
		},
		{
			name: "query with log types",
			req: &api.VlogsDatabaseRequest{
				Pvc:  []string{"pvc-001"},
				Type: []string{"stdout", "stderr"},
			},
			want:    `{volume_uid=~'pvc-001'} log_type:in('stdout','stderr')  | limit 100 | sort by (_time) desc`,
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
			want:    `{volume_uid=~'pvc-001'} *error* container:in('nginx') log_type:in('stderr') _time:2024-01-01 | limit 50 | sort by (_time) desc`,
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
		{
			name: "single pvc",
			req:  &api.VlogsDatabaseRequest{Pvc: []string{"pvc-001"}},
			want: "{volume_uid=~'pvc-001'}  | limit 100 | sort by (_time) desc",
		},
		{
			name: "multiple pvcs",
			req:  &api.VlogsDatabaseRequest{Pvc: []string{"pvc-001", "pvc-002"}},
			want: "{volume_uid=~'pvc-001|pvc-002'}  | limit 100 | sort by (_time) desc",
		},
		{
			name: "pvc with special characters",
			req:  &api.VlogsDatabaseRequest{Pvc: []string{"pvc'001", "pvc\\002"}},
			want: `{volume_uid=~'pvc\'001|pvc\\002'}  | limit 100 | sort by (_time) desc`,
		},
		{
			name: "single container",
			req:  &api.VlogsDatabaseRequest{Container: []string{"nginx"}},
			want: `container:in('nginx')  | limit 100 | sort by (_time) desc`,
		},
		{
			name: "multiple containers",
			req:  &api.VlogsDatabaseRequest{Container: []string{"nginx", "redis"}},
			want: `container:in('nginx','redis')  | limit 100 | sort by (_time) desc`,
		},
		{
			name: "container with special characters",
			req:  &api.VlogsDatabaseRequest{Container: []string{"nginx'test"}},
			want: `container:in('nginx\'test')  | limit 100 | sort by (_time) desc`,
		},
		{
			name: "single type",
			req:  &api.VlogsDatabaseRequest{Type: []string{"stdout"}},
			want: `log_type:in('stdout')  | limit 100 | sort by (_time) desc`,
		},
		{
			name: "multiple types",
			req:  &api.VlogsDatabaseRequest{Type: []string{"stdout", "stderr"}},
			want: `log_type:in('stdout','stderr')  | limit 100 | sort by (_time) desc`,
		},
		{
			name: "custom limit",
			req:  &api.VlogsDatabaseRequest{Limit: "50"},
			want: " | limit 50 | sort by (_time) desc",
		},
		{
			name: "with time filter",
			req:  &api.VlogsDatabaseRequest{Time: "2024-01-01"},
			want: "_time:2024-01-01 | limit 100 | sort by (_time) desc",
		},
		{
			name: "number mode with minute level",
			req:  &api.VlogsDatabaseRequest{NumberMode: modeTrue, NumberLevel: "m"},
			want: " | stats by (_time:1m) count() logs_total",
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
