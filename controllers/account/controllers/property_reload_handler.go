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

package controllers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/resources"
	"github.com/labring/sealos/controllers/pkg/utils"
	ctrl "sigs.k8s.io/controller-runtime"
)

var reloadLogger = ctrl.Log.WithName("property-reload-handler")

// PropertyReloadHandler is an HTTP handler to reload property types from database
type PropertyReloadHandler struct {
	DBClient          database.Interface
	AccountReconciler *AccountReconciler
	JwtSecret         string
}

func (h *PropertyReloadHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Authenticate admin request
	if err := authenticateAdminRequest(r, h.JwtSecret); err != nil {
		reloadLogger.Error(err, "admin authentication failed")
		http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
		return
	}

	reloadLogger.Info("received request to reload property types from authenticated admin")

	// Reload property types from database
	if err := h.DBClient.ReloadPropertyTypeLS(); err != nil {
		reloadLogger.Error(err, "failed to reload property types")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	var err error
	if _, err = h.AccountReconciler.AccountV2.ReloadAccountConfig(); err != nil {
		reloadLogger.Error(err, "failed to reload account config")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Get the reloaded properties count
	propertyCount := 0
	if resources.DefaultPropertyTypeLS != nil {
		propertyCount = len(resources.DefaultPropertyTypeLS.Types)
	}

	response := map[string]interface{}{
		"status":  "success",
		"message": "Property types reloaded successfully",
		"count":   propertyCount,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		reloadLogger.Error(err, "failed to encode response")
	}
}

// authenticateAdminRequest validates that the request is from an admin user
func authenticateAdminRequest(r *http.Request, jwtSecret string) error {
	tokenString := r.Header.Get("Authorization")
	if tokenString == "" {
		return errors.New("authorization header is required")
	}

	// Remove "Bearer " prefix if present
	token := strings.TrimPrefix(tokenString, "Bearer ")
	if token == "" || token == tokenString {
		return errors.New("invalid authorization token format")
	}

	// Create JWT manager and verify token
	jwtMgr := utils.NewJWTManager(jwtSecret, 0)
	user, err := jwtMgr.ParseUser(token)
	if err != nil {
		return err
	}

	if user == nil {
		return errors.New("user not found in token")
	}

	if user.Requester != AdminUserName {
		return errors.New("user is not admin")
	}

	return nil
}
