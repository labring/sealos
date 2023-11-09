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

// State is the state for a row.
type State string

const (
	// Active is the state for a normal row.
	Active State = "ACTIVE"
	// Deleted is the state for an removed row.
	Deleted State = "DELETED"
)

// EngineType is the type of the instance engine.
type EngineType string

const (
	// EngineTypeMySQL is the database type for MYSQL.
	EngineTypeMySQL EngineType = "MYSQL"
	// EngineTypePostgres is the database type for POSTGRES.
	EngineTypePostgres EngineType = "POSTGRES"
	// EngineTypeTiDB is the database type for TiDB.
	EngineTypeTiDB EngineType = "TIDB"
	// EngineTypeSnowflake is the database type for SNOWFLAKE.
	EngineTypeSnowflake EngineType = "SNOWFLAKE"
	// EngineTypeClickHouse is the database type for CLICKHOUSE.
	EngineTypeClickHouse EngineType = "CLICKHOUSE"
	// EngineTypeMongoDB is the database type for MongoDB.
	EngineTypeMongoDB EngineType = "MONGODB"
	// EngineTypeSQLite is the database type for SQLite.
	EngineTypeSQLite EngineType = "SQLITE"
)
