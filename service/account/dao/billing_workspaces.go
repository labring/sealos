package dao

import (
	"fmt"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Billing candidates include active memberships even when they have no bills in
// the selected period. Historical billing/subscription workspaces remain visible.
func billingWorkspaceQuery(db *gorm.DB, userUID uuid.UUID, historical []string) *gorm.DB {
	memberships := db.Model(&types.UserWorkspace{}).
		Select(`"UserWorkspace"."workspaceUid"`).
		Joins(`JOIN "UserCr" ON "UserCr".uid = "UserWorkspace"."userCrUid"`).
		Where(`"UserCr"."userUid" = ? AND "UserWorkspace".status = ?`,
			userUID, types.JoinStatusInWorkspace)
	query := db.Model(&types.Workspace{}).Where(`uid IN (?)`, memberships)
	if len(historical) > 0 {
		query = query.Or(`id IN ?`, historical)
	}
	privateMembership := memberships.Session(&gorm.Session{}).
		Where(`"UserWorkspace"."isPrivate" = ?`, true)
	// Keep the user's own private workspace first, including localized names.
	return query.Clauses(clause.OrderBy{Expression: clause.Expr{
		SQL: "CASE WHEN uid IN (?) THEN 0 ELSE 1 END, id", Vars: []interface{}{privateMembership},
	}})
}

func (g *Cockroach) getBillingWorkspaces(userUID uuid.UUID, historical []string) ([][]string, error) {
	var workspaces []types.Workspace
	if err := billingWorkspaceQuery(g.ck.GetLocalDB(), userUID, historical).Find(&workspaces).Error; err != nil {
		return nil, fmt.Errorf("failed to list billing workspaces: %w", err)
	}
	result := make([][]string, 0, len(workspaces))
	for _, workspace := range workspaces {
		result = append(result, []string{workspace.ID, workspace.DisplayName})
	}
	return result, nil
}
