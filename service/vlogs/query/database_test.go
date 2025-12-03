package query

import (
	"testing"

	"github.com/labring/sealos/service/pkg/api"
)

func TestDBLogsQuery_GetDBQuery(t *testing.T) {
	tests := []struct {
		name string
		req  *api.VlogsDatabaseRequest
		want string
	}{
		// Normal cases
		{
			name: "normal query with all filters",
			req: &api.VlogsDatabaseRequest{
				Pvc:       []string{"pvc-001"},
				Keyword:   "error",
				Container: []string{"nginx"},
				Type:      []string{"stdout"},
				Time:      "2024-01-01",
				Limit:     "50",
			},
			want: "{volume_uid=~'pvc-001'} 'error' container:in('nginx') log_type:in('stdout') time'2024-01-01'  | limit 50 | sort by (_time) desc",
		},

		// Empty value tests
		{
			name: "empty pvc list",
			req:  &api.VlogsDatabaseRequest{Pvc: []string{}},
			want: " | limit 100 | sort by (_time) desc",
		},
		{
			name: "empty keyword",
			req:  &api.VlogsDatabaseRequest{Pvc: []string{"pvc-001"}, Keyword: ""},
			want: "{volume_uid=~'pvc-001'}  | limit 100 | sort by (_time) desc",
		},
		{
			name: "empty container list",
			req:  &api.VlogsDatabaseRequest{Pvc: []string{"pvc-001"}, Container: []string{}},
			want: "{volume_uid=~'pvc-001'}  | limit 100 | sort by (_time) desc",
		},
		{
			name: "empty type list",
			req:  &api.VlogsDatabaseRequest{Pvc: []string{"pvc-001"}, Type: []string{}},
			want: "{volume_uid=~'pvc-001'}  | limit 100 | sort by (_time) desc",
		},
		{
			name: "empty time",
			req:  &api.VlogsDatabaseRequest{Pvc: []string{"pvc-001"}, Time: ""},
			want: "{volume_uid=~'pvc-001'}  | limit 100 | sort by (_time) desc",
		},

		// Invalid input tests
		{
			name: "invalid limit with letters",
			req:  &api.VlogsDatabaseRequest{Pvc: []string{"pvc-001"}, Limit: "abc"},
			want: "{volume_uid=~'pvc-001'}  | limit 100 | sort by (_time) desc",
		},
		{
			name: "invalid limit with special characters",
			req:  &api.VlogsDatabaseRequest{Pvc: []string{"pvc-001"}, Limit: "50@#$"},
			want: "{volume_uid=~'pvc-001'}  | limit 100 | sort by (_time) desc",
		},
		{
			name: "invalid number level",
			req: &api.VlogsDatabaseRequest{
				Pvc:         []string{"pvc-001"},
				NumberMode:  modeTrue,
				NumberLevel: "invalid",
			},
			want: "{volume_uid=~'pvc-001'} ",
		},

		// Special character escaping tests
		{
			name: "pvc with single quote",
			req:  &api.VlogsDatabaseRequest{Pvc: []string{"pvc'001"}},
			want: "{volume_uid=~'pvc\\'001'}  | limit 100 | sort by (_time) desc",
		},
		{
			name: "keyword with single quote",
			req:  &api.VlogsDatabaseRequest{Keyword: "it's error"},
			want: "'it\\'s error'  | limit 100 | sort by (_time) desc",
		},
		{
			name: "container with single quote",
			req:  &api.VlogsDatabaseRequest{Container: []string{"nginx'test"}},
			want: "container:in('nginx\\'test')  | limit 100 | sort by (_time) desc",
		},
		{
			name: "pvc with backslash",
			req:  &api.VlogsDatabaseRequest{Pvc: []string{"pvc\\001"}},
			want: "{volume_uid=~'pvc\\\\001'}  | limit 100 | sort by (_time) desc",
		},

		// SQL injection tests
		{
			name: "keyword sql injection attempt",
			req:  &api.VlogsDatabaseRequest{Keyword: "'; DROP TABLE logs; --"},
			want: "'\\'; DROP TABLE logs; --'  | limit 100 | sort by (_time) desc",
		},
		{
			name: "container sql injection attempt",
			req:  &api.VlogsDatabaseRequest{Container: []string{"nginx' OR '1'='1"}},
			want: "container:in('nginx\\' OR \\'1\\'=\\'1')  | limit 100 | sort by (_time) desc",
		},

		// Number mode tests
		{
			name: "number mode with hour level",
			req: &api.VlogsDatabaseRequest{
				Pvc:         []string{"pvc-001"},
				NumberMode:  modeTrue,
				NumberLevel: "h",
			},
			want: "{volume_uid=~'pvc-001'}  | stats by (_time:1h) count() logs_total",
		},
		{
			name: "number mode with minute level",
			req: &api.VlogsDatabaseRequest{
				Pvc:         []string{"pvc-001"},
				NumberMode:  modeTrue,
				NumberLevel: "m",
			},
			want: "{volume_uid=~'pvc-001'}  | stats by (_time:1m) count() logs_total",
		},
		{
			name: "number mode disabled",
			req: &api.VlogsDatabaseRequest{
				Pvc:        []string{"pvc-001"},
				NumberMode: "false",
			},
			want: "{volume_uid=~'pvc-001'}  | limit 100 | sort by (_time) desc",
		},

		// Edge cases
		{
			name: "completely empty request",
			req:  &api.VlogsDatabaseRequest{},
			want: " | limit 100 | sort by (_time) desc",
		},
		{
			name: "very large limit",
			req:  &api.VlogsDatabaseRequest{Limit: "999999999999"},
			want: " | limit 999999999999 | sort by (_time) desc",
		},
		{
			name: "multiple pvcs",
			req:  &api.VlogsDatabaseRequest{Pvc: []string{"pvc-001", "pvc-002", "pvc-003"}},
			want: "{volume_uid=~'pvc-001|pvc-002|pvc-003'}  | limit 100 | sort by (_time) desc",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := &DBLogsQuery{}
			got, err := v.GetDBQuery(tt.req)
			if err != nil {
				t.Errorf("GetDBQuery() error = %v", err)
				return
			}
			if got != tt.want {
				t.Errorf("GetDBQuery()\ngot  = %q\nwant = %q", got, tt.want)
			}
		})
	}
}
