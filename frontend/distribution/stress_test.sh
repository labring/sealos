#!/bin/bash

# 定义 API 基础 URL
BASE_URL="http://127.0.0.1:5003"

# 定义压测所需的参数
STRESS_ID="test_stress_id_1"
STRESS_TYPE="two"
NAMESPACE="test01"
APP_LIST="nginx,python-app-lst"
PORT="32567"
CORE_API="/test"
TEST_DATA="1234"
QPS=1000
MAX_LATENCY=200

# 测试 /api/stressTesting 接口
echo "Testing /api/stressTesting..."
STRESS_TEST_URL="${BASE_URL}/api/stressTesting?stress_id=${STRESS_ID}&stress_type=${STRESS_TYPE}&namespace=${NAMESPACE}&app_list=${APP_LIST}&port=${PORT}&core_api=${CORE_API}&test_data=${TEST_DATA}&qps=${QPS}&max_latency=${MAX_LATENCY}"
curl -X GET "$STRESS_TEST_URL"
echo

# 测试 /api/listResults 接口
echo "Testing /api/listResults..."
LIST_RESULTS_URL="${BASE_URL}/api/listResults?stress_id=${STRESS_ID}&stress_type=${STRESS_TYPE}"
curl -X GET "$LIST_RESULTS_URL"
echo

# 测试 /api/mockRunTest 接口
echo "Testing /api/mockRunTest..."
MOCK_RUN_TEST_URL="${BASE_URL}/api/mockRunTest?stress_id=${STRESS_ID}"
curl -X GET "$MOCK_RUN_TEST_URL"
echo

# 测试 /api/listResults 接口
echo "Testing /api/listResults..."
LIST_RESULTS_URL="${BASE_URL}/api/listResults?stress_id=${STRESS_ID}&stress_type=${STRESS_TYPE}"
curl -X GET "$LIST_RESULTS_URL"
echo

# 测试 /api/deleteResult 接口
echo "Testing /api/deleteResult..."
DELETE_RESULT_URL="${BASE_URL}/api/deleteResult"
curl -X POST -H "Content-Type: application/json" -d "{\"stress_id\": \"${STRESS_ID}\"}" "$DELETE_RESULT_URL"
echo