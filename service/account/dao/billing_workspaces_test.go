package dao

import (
	"reflect"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestBillingWorkspaceMembershipScope(t *testing.T) {
	db, err := gorm.Open(postgres.New(postgres.Config{DSN: "host=unused"}), &gorm.Config{
		DryRun: true, DisableAutomaticPing: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	userUID := uuid.New()
	for _, history := range [][]string{nil, {"ns-history", "ns-subscription"}} {
		var rows []types.Workspace
		stmt := billingWorkspaceQuery(db, userUID, history).Find(&rows).Statement
		query := stmt.SQL.String()
		// Memberships must be scoped to the authenticated user and active status,
		// including when there is no billing history at all.
		for _, clause := range []string{
			`"UserCr"."userUid" = $1`, `"UserWorkspace".status = $2`,
			`JOIN "UserCr" ON "UserCr".uid = "UserWorkspace"."userCrUid"`,
			`uid IN (SELECT "UserWorkspace"."workspaceUid"`,
		} {
			if !strings.Contains(query, clause) {
				t.Fatalf("missing membership restriction %q: %s", clause, query)
			}
		}
		want := []interface{}{userUID, types.JoinStatusInWorkspace}
		for _, namespace := range history {
			want = append(want, namespace)
		}
		want = append(want, userUID, types.JoinStatusInWorkspace, true)
		if !reflect.DeepEqual(stmt.Vars, want) {
			t.Fatalf("query parameters = %#v, want %#v", stmt.Vars, want)
		}
		if strings.Contains(query, " OR id IN") != (len(history) > 0) {
			t.Fatalf("historical workspaces must supplement memberships: %s", query)
		}
		if !strings.Contains(query, `ORDER BY CASE WHEN uid IN`) ||
			!strings.Contains(query, `"UserWorkspace"."isPrivate" = `) {
			t.Fatalf("own private workspace must be first regardless of display language: %s", query)
		}
	}
}
