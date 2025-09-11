#!/bin/bash
# Copyright © 2024 sealos.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -e

# Script to generate weekly community reports for Sealos
REPO_OWNER="labring"
REPO_NAME="sealos"

# Get the end date of the week (Saturday) - default to last Saturday if not provided
if [ -z "$1" ]; then
    # Calculate last Saturday
    END_DATE=$(date -d "last saturday" +%Y-%m-%d)
else
    END_DATE="$1"
fi

# Calculate start date (Sunday before the end date)
START_DATE=$(date -d "$END_DATE - 6 days" +%Y-%m-%d)

# Format dates for GitHub API (ISO format with time)
START_DATE_ISO="${START_DATE}T00:00:00Z"
END_DATE_ISO=$(date -d "$END_DATE + 1 day" -I)T00:00:00Z

REPORT_FILE="reports/weekly/${END_DATE}-weekly-report.md"

echo "Generating weekly report for $START_DATE to $END_DATE"
echo "Report will be saved to: $REPORT_FILE"

# Create reports directory if it doesn't exist
mkdir -p reports/weekly

# Function to make GitHub API requests with error handling
github_api() {
    local endpoint="$1"
    local params="$2"
    local output_file="$3"
    
    if [ -n "$GITHUB_TOKEN" ]; then
        curl -s -H "Authorization: token $GITHUB_TOKEN" \
             -H "Accept: application/vnd.github.v3+json" \
             "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/$endpoint?$params" -o "$output_file"
    else
        echo "Warning: GITHUB_TOKEN not set, using unauthenticated requests (limited rate)" >&2
        curl -s -H "Accept: application/vnd.github.v3+json" \
             "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/$endpoint?$params" -o "$output_file"
    fi
    
    # Check if the API response is valid JSON
    if ! jq empty "$output_file" 2>/dev/null; then
        echo "Error: Invalid JSON response from GitHub API" >&2
        echo "Response content:" >&2
        cat "$output_file" >&2
        return 1
    fi
    
    # Check for API errors
    if jq -e '.message' "$output_file" >/dev/null 2>&1; then
        echo "GitHub API Error: $(jq -r '.message' "$output_file")" >&2
        return 1
    fi
    
    return 0
}

# Function to get contributor activity
get_contributor_stats() {
    echo "Fetching contributor statistics..."
    
    # Create temporary files
    local pr_raw_data="/tmp/prs_raw.json"
    local issues_raw_data="/tmp/issues_raw.json"
    
    # Get PRs merged during the week
    echo "Fetching PRs..."
    if ! github_api "pulls" "state=closed&sort=updated&direction=desc&per_page=100" "$pr_raw_data"; then
        echo "Failed to fetch PR data, using empty data" >&2
        echo "[]" > "$pr_raw_data"
    fi
    
    # Get issues created during the week  
    echo "Fetching issues..."
    if ! github_api "issues" "state=all&sort=created&direction=desc&since=$START_DATE_ISO&per_page=100" "$issues_raw_data"; then
        echo "Failed to fetch issues data, using empty data" >&2
        echo "[]" > "$issues_raw_data"
    fi
    
    # Process PR data
    echo "Processing PR statistics..."
    jq -r --arg start "$START_DATE_ISO" --arg end "$END_DATE_ISO" '
    [.[] | select(.merged_at != null and .merged_at >= $start and .merged_at < $end)] |
    group_by(.user.login) |
    map({
        user: .[0].user.login,
        count: length,
        prs: [.[] | {number: .number, title: .title, merged_at: .merged_at, user: .user.login}]
    }) |
    sort_by(-.count)' "$pr_raw_data" > /tmp/pr_stats.json || {
        echo "Error processing PR data, using empty stats" >&2
        echo "[]" > /tmp/pr_stats.json
    }
    
    # Process Issues data (filter for the date range and exclude PRs)
    echo "Processing issue statistics..."
    jq -r --arg start "$START_DATE_ISO" --arg end "$END_DATE_ISO" '
    [.[] | select(.pull_request == null and .created_at >= $start and .created_at < $end)] |
    group_by(.user.login) |
    map({
        user: .[0].user.login,
        count: length,
        issues: [.[] | {number: .number, title: .title, created_at: .created_at, user: .user.login}]
    }) |
    sort_by(-.count)' "$issues_raw_data" > /tmp/issue_stats.json || {
        echo "Error processing issues data, using empty stats" >&2
        echo "[]" > /tmp/issue_stats.json
    }
    
    # Clean up raw data files
    rm -f "$pr_raw_data" "$issues_raw_data"
}

# Function to generate the report
generate_report() {
    cat > "$REPORT_FILE" << EOF
# Sealos Weekly Community Report

**Report Period:** $START_DATE to $END_DATE

## 📊 Weekly Statistics

EOF

    # Add PR statistics
    echo "### Pull Request Activity" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    local total_prs=$(jq '[.[].count] | add // 0' /tmp/pr_stats.json)
    local unique_pr_contributors=$(jq 'length' /tmp/pr_stats.json)
    
    echo "- **Total PRs Merged:** $total_prs" >> "$REPORT_FILE"
    echo "- **Contributors with Merged PRs:** $unique_pr_contributors" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Top PR contributors
    if [ "$total_prs" -gt 0 ]; then
        echo "#### Top Contributors by PRs Merged" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        jq -r '.[:10] | .[] | "- **\(.user)**: \(.count) PRs merged"' /tmp/pr_stats.json >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    fi
    
    # Add Issue statistics
    echo "### Issue Activity" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    local total_issues=$(jq '[.[].count] | add // 0' /tmp/issue_stats.json)
    local unique_issue_contributors=$(jq 'length' /tmp/issue_stats.json)
    
    echo "- **Total Issues Created:** $total_issues" >> "$REPORT_FILE"
    echo "- **Contributors Creating Issues:** $unique_issue_contributors" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Top issue contributors
    if [ "$total_issues" -gt 0 ]; then
        echo "#### Top Contributors by Issues Created" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        jq -r '.[:5] | .[] | "- **\(.user)**: \(.count) issues created"' /tmp/issue_stats.json >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    fi
    
    # Add detailed PR list
    if [ "$total_prs" -gt 0 ]; then
        echo "## 🚀 Merged Pull Requests" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        
        # Get all PRs and sort by merge date, handle missing user gracefully
        jq -r '.[] | .prs[] | "- [\(.title)](https://github.com/labring/sealos/pull/\(.number)) by @\(.user // "unknown") - \(.merged_at[:10])"' /tmp/pr_stats.json | sort >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    else
        echo "## 🚀 Merged Pull Requests" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        echo "No pull requests were merged during this period." >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    fi
    
    # Add detailed issues list
    if [ "$total_issues" -gt 0 ]; then
        echo "## 🐛 New Issues" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        
        jq -r '.[] | .issues[] | "- [\(.title)](https://github.com/labring/sealos/issues/\(.number)) by @\(.user // "unknown") - \(.created_at[:10])"' /tmp/issue_stats.json | sort >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    else
        echo "## 🐛 New Issues" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        echo "No new issues were created during this period." >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    fi
    
    # Add footer
    echo "---" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "*This report was automatically generated on $(date -u +%Y-%m-%d) UTC*" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "**Thank you to all contributors who made this week's progress possible! 🎉**" >> "$REPORT_FILE"
}

# Main execution
main() {
    echo "Starting weekly report generation..."
    
    # Check if required tools are available
    if ! command -v jq &> /dev/null; then
        echo "Error: jq is required but not installed. Please install jq first."
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        echo "Error: curl is required but not installed. Please install curl first."
        exit 1
    fi
    
    get_contributor_stats
    generate_report
    
    echo "Weekly report generated successfully: $REPORT_FILE"
    echo "Summary:"
    echo "- Report period: $START_DATE to $END_DATE"
    echo "- Total PRs merged: $(jq '[.[].count] | add // 0' /tmp/pr_stats.json)"
    echo "- Total issues created: $(jq '[.[].count] | add // 0' /tmp/issue_stats.json)"
    
    # Clean up temporary files
    rm -f /tmp/pr_stats.json /tmp/issue_stats.json
}

main "$@"