#!/bin/bash

set -e

REPO_NAME=$(jq -r ".repository.full_name" "$GITHUB_EVENT_PATH")

onerror() {
	gh pr comment $PR_NUMBER --body "🤖 says: ‼️ cherry pick action failed.<br/>See: https://github.com/$REPO_NAME/actions/runs/$GITHUB_RUN_ID"
	exit 1
}
trap onerror ERR

if [ -z "$PR_NUMBER" ]; then
	PR_NUMBER=$(jq -r ".pull_request.number" "$GITHUB_EVENT_PATH")
	if [[ "$PR_NUMBER" == "null" ]]; then
		PR_NUMBER=$(jq -r ".issue.number" "$GITHUB_EVENT_PATH")
	fi
	if [[ "$PR_NUMBER" == "null" ]]; then
		echo "Failed to determine PR Number."
		exit 1
	fi
fi

echo "Collecting information about PR #$PR_NUMBER of $GITHUB_REPOSITORY..."

if [[ -z "$GITHUB_TOKEN" ]]; then
	echo "Set the GITHUB_TOKEN env variable."
	exit 1
fi

URI=https://api.github.com

MAX_RETRIES=${MAX_RETRIES:-6}
RETRY_INTERVAL=${RETRY_INTERVAL:-10}
MERGED=""
MERGE_COMMIT=""
pr_resp=""

for ((i = 0 ; i < $MAX_RETRIES ; i++)); do
	pr_resp=$(gh api "${URI}/repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER")
	MERGED=$(echo "$pr_resp" | jq -r .merged)
	MERGE_COMMIT=$(echo "$pr_resp" | jq -r .merge_commit_sha)
	if [[ "$MERGED" == "null" ]]; then
		echo "The PR is not ready to cherry-pick, retry after $RETRY_INTERVAL seconds"
		sleep $RETRY_INTERVAL
		continue
	else
		break
	fi
done

if [[ "$MERGED" != "true" ]] ; then
	echo "PR is not merged! Can't cherry pick it."
	gh pr comment $PR_NUMBER --body "🤖 says: ‼️ PR can't be cherry-picked, please merge it first."
	exit 1
fi

TARGET_BRANCH=$(jq -r ".comment.body" "$GITHUB_EVENT_PATH" | awk '{ print $2 }'  | tr -d '[:space:]')

if [[ -z "$TARGET_BRANCH" ]]; then
	echo "Cannot get target branch information for PR #$PR_NUMBER!"
	gh pr comment $PR_NUMBER --body "🤖 says: ‼️ Cannot get target branch information."
	exit 1
fi

echo "Target branch for PR #$PR_NUMBER is $TARGET_BRANCH"

# make sure branches are up-to-date
git fetch origin $TARGET_BRANCH
git checkout -b $TARGET_BRANCH origin/$TARGET_BRANCH

git cherry-pick $MERGE_COMMIT &> /tmp/error.log || (
		gh pr comment $PR_NUMBER --body "🤖 says: Error cherry-picking.<br/><br/>$(cat /tmp/error.log)"
		gh issue create --title "Error cherry-picking PR #$PR_NUMBER" --body "Error cherry-picking PR #$PR_NUMBER into $TARGET_BRANCH:<br/><br/>$(cat /tmp/error.log)" --assignee "cuisongliu" --label "cherry-pick"
		exit 1
)

gh pr comment $PR_NUMBER --body "🤖 says: cherry pick action finished successfully 🎉!<br/>See: https://github.com/$REPO_NAME/actions/runs/$GITHUB_RUN_ID"
