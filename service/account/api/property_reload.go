// Copyright © 2023 sealos.
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

package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/controllers/pkg/resources"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/helper"
)

// ReloadPropertyTypes reloads property types from database and updates the global DefaultPropertyTypeLS
// @Summary Reload property types
// @Description Reload property types from database and update the global DefaultPropertyTypeLS
// @Tags Admin
// @Accept json
// @Produce json
// @Success 200 {object} helper.ReloadPropertyTypesResp "successfully reloaded property types"
// @Failure 401 {object} helper.ErrorMessage "authenticate error"
// @Failure 500 {object} helper.ErrorMessage "failed to reload property types"
// @Router /admin/v1alpha1/reload-property-types [post]
func ReloadPropertyTypes(c *gin.Context) {
	// Authenticate admin request
	err := authenticateAdminRequest(c)
	if err != nil {
		c.JSON(
			http.StatusUnauthorized,
			helper.ErrorMessage{
				Error: "authenticate error: " + err.Error(),
			},
		)
		return
	}

	// Reload property types from database
	if err := dao.DBClient.ReloadConfig(); err != nil {
		c.JSON(
			http.StatusInternalServerError,
			helper.ErrorMessage{
				Error: "failed to reload property types: " + err.Error(),
			},
		)
		return
	}

	// Get the reloaded properties count
	propertyCount := 0
	if resources.DefaultPropertyTypeLS != nil {
		propertyCount = len(resources.DefaultPropertyTypeLS.Types)
	}

	c.JSON(http.StatusOK, helper.ReloadPropertyTypesResp{
		Message: "Property types reloaded successfully",
		Data: helper.ReloadPropertyTypesRespData{
			Status: "success",
			Count:  propertyCount,
		},
	})
}
