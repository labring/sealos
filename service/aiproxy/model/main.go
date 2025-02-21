package model

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/env"

	// import fastjson serializer
	_ "github.com/labring/sealos/service/aiproxy/common/fastJSONSerializer"
	log "github.com/sirupsen/logrus"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormLogger "gorm.io/gorm/logger"
)

var (
	DB    *gorm.DB
	LogDB *gorm.DB
)

func chooseDB(envName string) (*gorm.DB, error) {
	dsn := os.Getenv(envName)

	switch {
	case strings.HasPrefix(dsn, "postgres"):
		// Use PostgreSQL
		log.Info("using PostgreSQL as database")
		common.UsingPostgreSQL = true
		return OpenPostgreSQL(dsn)
	case strings.HasPrefix(dsn, "mysql"):
		// Use MySQL
		log.Info("using MySQL as database")
		common.UsingMySQL = true
		return OpenMySQL(dsn)
	default:
		// Use SQLite
		log.Info("SQL_DSN not set, using SQLite as database: ", common.SQLitePath)
		common.UsingSQLite = true
		return OpenSQLite(common.SQLitePath)
	}
}

func newDBLogger() gormLogger.Interface {
	var logLevel gormLogger.LogLevel
	if config.DebugSQLEnabled {
		logLevel = gormLogger.Info
	} else {
		logLevel = gormLogger.Warn
	}
	return gormLogger.New(
		log.StandardLogger(),
		gormLogger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logLevel,
			IgnoreRecordNotFoundError: true,
			ParameterizedQueries:      !config.DebugSQLEnabled,
			Colorful:                  common.NeedColor(),
		},
	)
}

func OpenPostgreSQL(dsn string) (*gorm.DB, error) {
	return gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true, // disables implicit prepared statement usage
	}), &gorm.Config{
		PrepareStmt:                              true, // precompile SQL
		TranslateError:                           true,
		Logger:                                   newDBLogger(),
		DisableForeignKeyConstraintWhenMigrating: false,
		IgnoreRelationshipsWhenMigrating:         false,
	})
}

func OpenMySQL(dsn string) (*gorm.DB, error) {
	return gorm.Open(mysql.Open(strings.TrimPrefix(dsn, "mysql://")), &gorm.Config{
		PrepareStmt:                              true, // precompile SQL
		TranslateError:                           true,
		Logger:                                   newDBLogger(),
		DisableForeignKeyConstraintWhenMigrating: false,
		IgnoreRelationshipsWhenMigrating:         false,
	})
}

func OpenSQLite(sqlitePath string) (*gorm.DB, error) {
	baseDir := filepath.Dir(sqlitePath)
	if err := os.MkdirAll(baseDir, 0o755); err != nil {
		return nil, fmt.Errorf("failed to create base directory: %w", err)
	}

	dsn := fmt.Sprintf("%s?_busy_timeout=%d", sqlitePath, common.SQLiteBusyTimeout)
	return gorm.Open(sqlite.Open(dsn), &gorm.Config{
		PrepareStmt:                              true, // precompile SQL
		TranslateError:                           true,
		Logger:                                   newDBLogger(),
		DisableForeignKeyConstraintWhenMigrating: false,
		IgnoreRelationshipsWhenMigrating:         false,
	})
}

func InitDB() {
	var err error
	DB, err = chooseDB("SQL_DSN")
	if err != nil {
		log.Fatal("failed to initialize database: " + err.Error())
		return
	}

	setDBConns(DB)

	if config.DisableAutoMigrateDB {
		return
	}

	log.Info("database migration started")
	if err = migrateDB(); err != nil {
		log.Fatal("failed to migrate database: " + err.Error())
		return
	}
	log.Info("database migrated")
}

func migrateDB() error {
	err := DB.AutoMigrate(
		&Channel{},
		&ChannelTest{},
		&Token{},
		&Group{},
		&Option{},
		&ModelConfig{},
	)
	if err != nil {
		return err
	}
	return nil
}

func InitLogDB() {
	if os.Getenv("LOG_SQL_DSN") == "" {
		LogDB = DB
		if config.DisableAutoMigrateDB {
			return
		}
		err := migrateLOGDB()
		if err != nil {
			log.Fatal("failed to migrate secondary database: " + err.Error())
			return
		}
		log.Info("secondary database migrated")
		return
	}

	log.Info("using secondary database for table logs")
	var err error
	LogDB, err = chooseDB("LOG_SQL_DSN")
	if err != nil {
		log.Fatal("failed to initialize secondary database: " + err.Error())
		return
	}

	setDBConns(LogDB)

	if config.DisableAutoMigrateDB {
		return
	}

	log.Info("secondary database migration started")
	err = migrateLOGDB()
	if err != nil {
		log.Fatal("failed to migrate secondary database: " + err.Error())
		return
	}
	log.Info("secondary database migrated")
}

func migrateLOGDB() error {
	err := LogDB.AutoMigrate(
		&Log{},
		&RequestDetail{},
		&ConsumeError{},
	)
	if err != nil {
		return err
	}

	return CreateLogIndexes(LogDB)
}

func setDBConns(db *gorm.DB) {
	if config.DebugSQLEnabled {
		db = db.Debug()
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("failed to connect database: " + err.Error())
		return
	}

	sqlDB.SetMaxIdleConns(int(env.Int64("SQL_MAX_IDLE_CONNS", 100)))
	sqlDB.SetMaxOpenConns(int(env.Int64("SQL_MAX_OPEN_CONNS", 1000)))
	sqlDB.SetConnMaxLifetime(time.Second * time.Duration(env.Int64("SQL_MAX_LIFETIME", 60)))
}

func closeDB(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	err = sqlDB.Close()
	return err
}

func CloseDB() error {
	if LogDB != DB {
		err := closeDB(LogDB)
		if err != nil {
			return err
		}
	}
	return closeDB(DB)
}
