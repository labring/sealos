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
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"

	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/utils"
)

func Test_splitSmsCodeMap(t *testing.T) {
	codeMap, err := splitSmsCodeMap("0:SMS_123456,1:SMS_654321,2:SMS_987654")
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("codeMap: %v", codeMap)
	if len(codeMap) != 3 {
		t.Fatal("invalid codeMap")
	}
	if codeMap["0"] != "SMS_123456" {
		t.Fatal("invalid codeMap")
	}
	if codeMap["1"] != "SMS_654321" {
		t.Fatal("invalid codeMap")
	}
	if codeMap["2"] != "SMS_987654" {
		t.Fatal("invalid codeMap")
	}
}

func TestGetTimeInUTCPlus8(t *testing.T) {
	t1 := time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC)
	t2 := time.Date(2023, 1, 1, 1, 0, 0, 0, time.UTC)
	t3 := time.Date(2023, 1, 1, 9, 0, 0, 0, time.UTC)
	t4 := time.Date(2023, 1, 1, 11, 0, 0, 0, time.UTC)
	t5 := time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC)
	t6 := time.Date(2023, 1, 1, 13, 0, 0, 0, time.UTC)
	t7 := time.Date(2023, 1, 1, 23, 0, 0, 0, time.UTC)
	for _, _t := range []time.Time{t1, t2, t3, t4, t5, t6, t7} {
		t.Logf("time: %v, timeInUTCPlus8: %v", _t, GetSendVmsTimeInUTCPlus8(_t))
	}
}

const (
	processedUsersFile = "processed_users.txt"
)

// TestReconcileAllFinalUser 测试方法
func TestReconcileAllFinalUser(t *testing.T) {
	os.Setenv("LOCAL_REGION", "4b55d7c5-ff65-4eb7-9bcf-726c730a0fad")
	account, err := database.NewAccountV2("postgresql://sealos:fb9jg8te4x78ocqrr2vgbs99qauh9flfd1u6g300kq7ywjay3ah7cndr60udd6wg@192.168.10.35:32749/global", "postgresql://sealos:vtzfqp8hbkn7jdstzkbac6cd4u84n6w3s28f8wnqzrts2b96xcs7v58r1a18ihds@192.168.10.35:32749/local")
	if err != nil {
		t.Fatalf("failed to new account: %v", err)
	}
	defer func() {
		if err := account.Close(); err != nil {
			t.Errorf("failed close connection: %v", err)
		}
	}()

	regions, err := account.GetRegions()
	if err != nil {
		t.Fatalf("failed to get regions: %v", err)
	}
	allRegionDomain := make([]string, 0)
	for _, region := range regions {
		if region.Domain != "" {
			allRegionDomain = append(allRegionDomain, region.Domain)
		}
	}

	jwtManager := utils.NewJWTManager("98r7c1zjllv4kgn67trj1cknprnpcwup3hh38b44puhfrbkmzy9bjipbw4tclr3f", time.Hour*24)

	// 获取全部 Debt 状态为 FinalDeletionPeriod 的用户
	allUserUID := make([]uuid.UUID, 0)
	err = account.GetGlobalDB().Model(&types.Debt{}).Where("account_debt_status = ?", types.FinalDeletionPeriod).Pluck("user_uid", &allUserUID).Error
	if err != nil {
		t.Fatalf("failed to get all user: %v", err)
	}
	if len(allUserUID) == 0 {
		t.Logf("no user need to flush")
		return
	}

	// 创建临时文件路径
	tempDir := os.TempDir()
	processedFilePath := filepath.Join(tempDir, processedUsersFile)

	// 加载已处理的用户 UID
	processedUsers, err := loadProcessedUsers(processedFilePath)
	if err != nil {
		t.Fatalf("failed to load processed users: %v", err)
	}

	for _, user := range allUserUID {
		if processedUsers[user] {
			t.Logf("user %s already processed, skipping", user)
			continue
		}

		err = sendFlushDebtResourceStatusRequest(allRegionDomain, jwtManager, user, processedFilePath)
		if err != nil {
			t.Fatalf("failed to send flush debt resource status request for user %s: %v", user, err)
		}

		if err := recordProcessedUser(processedFilePath, user); err != nil {
			t.Fatalf("failed to record processed user %s: %v", user, err)
		}
	}
	t.Logf("all users processed successfully")
	// 删除临时文件
	//if err := os.Remove(processedFilePath); err != nil {
	//	t.Fatalf("failed to remove processed users file: %v", err)
	//}
}

// loadProcessedUsers 从文件中加载已处理的用户 UID
func loadProcessedUsers(filePath string) (map[uuid.UUID]bool, error) {
	processed := make(map[uuid.UUID]bool)
	data, err := os.ReadFile(filePath)
	if os.IsNotExist(err) {
		return processed, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to read processed users file: %w", err)
	}

	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		uid, err := uuid.Parse(line)
		if err != nil {
			return nil, fmt.Errorf("invalid UUID in processed users file: %s", line)
		}
		processed[uid] = true
	}
	return processed, nil
}

// recordProcessedUser 将处理成功的用户 UID 追加到文件中
func recordProcessedUser(filePath string, userUID uuid.UUID) error {
	f, err := os.OpenFile(filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open processed users file: %w", err)
	}
	defer f.Close()

	if _, err := f.WriteString(userUID.String() + "\n"); err != nil {
		return fmt.Errorf("failed to write user UID to file: %w", err)
	}
	return nil
}

// sendFlushDebtResourceStatusRequest 发送请求并记录成功处理的用户
func sendFlushDebtResourceStatusRequest(allRegionDomain []string, jwtManager *utils.JWTManager, userUID uuid.UUID, processedFilePath string) error {
	for _, domain := range allRegionDomain {
		fmt.Println("domain:", domain, " userUID:", userUID)
		token, err := jwtManager.GenerateToken(utils.JwtUser{
			Requester: AdminUserName,
		})
		if err != nil {
			return fmt.Errorf("failed to generate token: %w", err)
		}

		url := fmt.Sprintf("https://account-api.%s/admin/v1alpha1/flush-debt-resource-status", domain)

		quotaReqBody, err := json.Marshal(AdminFlushResourceStatusReq{
			LastDebtStatus:    types.DebtDeletionPeriod,
			CurrentDebtStatus: types.FinalDeletionPeriod,
			UserUID:           userUID,
		})
		if err != nil {
			return fmt.Errorf("failed to marshal request: %w", err)
		}

		var lastErr error
		backoffTime := time.Second
		maxRetries := 3
		for attempt := 1; attempt <= maxRetries; attempt++ {
			req, err := http.NewRequest("POST", url, bytes.NewBuffer(quotaReqBody))
			if err != nil {
				return fmt.Errorf("failed to create request: %w", err)
			}

			req.Header.Set("Authorization", "Bearer "+token)
			req.Header.Set("Content-Type", "application/json")
			client := http.Client{}

			resp, err := client.Do(req)
			if err != nil {
				lastErr = fmt.Errorf("failed to send request: %w", err)
			} else {
				defer resp.Body.Close()

				if resp.StatusCode == http.StatusOK {
					lastErr = nil
					break
				}
				lastErr = fmt.Errorf("unexpected status code: %d", resp.StatusCode)
			}

			if attempt < maxRetries {
				fmt.Printf("Attempt %d failed: %v. Retrying in %v...\n", attempt, lastErr, backoffTime)
				time.Sleep(backoffTime)
				backoffTime *= 2
			}
		}
		if lastErr != nil {
			return lastErr
		}
	}
	return nil
}
