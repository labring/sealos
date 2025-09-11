# Sealos Weekly Community Reports

This document explains the automated weekly community report system for the Sealos project.

## Overview

The weekly community report system automatically tracks and summarizes community activity including:
- Pull requests merged by contributors
- Issues created and community engagement  
- Top contributor recognition
- Project activity summaries

## System Components

### 1. Report Generation Script
**Location:** `scripts/weekly-report.sh`

**Features:**
- Fetches data from GitHub API with authentication support
- Processes PR and issue statistics
- Generates markdown reports with contributor rankings
- Handles API rate limiting and error conditions
- Supports manual date range specification

**Usage:**
```bash
# Generate report for current week (last Saturday)
bash scripts/weekly-report.sh

# Generate report for specific week ending date
bash scripts/weekly-report.sh 2024-12-21

# Set GitHub token for higher API limits
GITHUB_TOKEN=your_token bash scripts/weekly-report.sh
```

### 2. Automated Workflow
**Location:** `.github/workflows/weekly-report.yml`

**Schedule:** Every Monday at 09:00 UTC (02:00 PST, 17:00 CST)

**Process:**
1. Executes the report generation script
2. Creates a pull request with the generated report
3. Labels PR with `documentation`, `community`, `weekly-report`
4. Assigns appropriate reviewers for approval

**Manual Trigger:** Available via workflow_dispatch with optional date parameter

### 3. Report Storage
**Location:** `reports/weekly/`

**Structure:**
- Reports named as `YYYY-MM-DD-weekly-report.md` (week ending date)
- Each report covers Sunday to Saturday activity
- Archive organized chronologically for easy browsing

## Report Format

Each weekly report includes:

### Statistics Section
- Total PRs merged and contributor count
- Total issues created and contributor count  
- Top contributors by activity

### Detailed Sections
- **Merged Pull Requests**: List of all PRs with links and authors
- **New Issues**: List of all issues with links and authors
- **Recognition**: Highlighting top contributors

### Sample Structure
```markdown
# Sealos Weekly Community Report
**Report Period:** YYYY-MM-DD to YYYY-MM-DD

## 📊 Weekly Statistics
### Pull Request Activity
- **Total PRs Merged:** X
- **Contributors with Merged PRs:** Y

#### Top Contributors by PRs Merged
- **username**: X PRs merged

### Issue Activity  
- **Total Issues Created:** X
- **Contributors Creating Issues:** Y

## 🚀 Merged Pull Requests
[List of PRs with links]

## 🐛 New Issues  
[List of issues with links]
```

## Configuration

### GitHub API Access
The script uses the GitHub REST API v3. For better rate limits, set the `GITHUB_TOKEN` environment variable:

```bash
export GITHUB_TOKEN="ghp_xxxxxxxxxxxx"
```

Without authentication: 60 requests/hour
With authentication: 5000 requests/hour

### Workflow Permissions
Required permissions in the workflow:
- `contents: write` - To create commits and push changes
- `pull-requests: write` - To create PRs with reports

### Date Calculations
- Week starts on Sunday, ends on Saturday
- Reports generated on Monday for the previous week
- Manual generation accepts any Saturday end date

## Maintenance

### Adding New Metrics
To add new metrics to reports, modify `scripts/weekly-report.sh`:

1. Add new GitHub API calls in `get_contributor_stats()`
2. Process data and create statistics  
3. Update `generate_report()` to include new sections
4. Test with manual execution

### Customizing Report Format
Edit the report generation sections in `generate_report()`:
- Modify markdown templates
- Add/remove statistics sections
- Change contributor ranking criteria
- Adjust date formatting

### Troubleshooting

**Common Issues:**

1. **API Rate Limiting**
   - Solution: Set `GITHUB_TOKEN` environment variable
   - Check remaining rate limit: `curl -I https://api.github.com/rate_limit`

2. **Invalid JSON Response**
   - Often caused by network issues or API maintenance
   - Script handles gracefully with empty data fallbacks

3. **Date Calculation Errors**  
   - Ensure `date` command supports required format options
   - Test date calculations manually: `date -d "last saturday" +%Y-%m-%d`

4. **Workflow Permission Errors**
   - Verify `GITHUB_TOKEN` has required permissions
   - Check repository settings for Actions permissions

### Manual Execution
For testing or one-off reports:

```bash
# Set working directory
cd /path/to/sealos

# Install dependencies  
sudo apt-get install -y jq curl

# Run with token for better rate limits
GITHUB_TOKEN=your_token bash scripts/weekly-report.sh 2024-12-21

# Check generated report
cat reports/weekly/2024-12-21-weekly-report.md
```

## Future Enhancements

Potential improvements to consider:
- **Enhanced Metrics**: Code review participation, first-time contributors
- **Visualizations**: Charts and graphs in reports
- **Notifications**: Slack/Discord integration for report announcements  
- **Historical Analytics**: Trend analysis across multiple weeks
- **Internationalization**: Multi-language report generation

## Contributing

To contribute to the weekly report system:

1. **Report Issues**: Use GitHub Issues with `community` label
2. **Suggest Features**: Open enhancement requests
3. **Submit Improvements**: Fork, modify scripts, submit PR
4. **Test Changes**: Run manual report generation before submitting

## License

The weekly community report system follows the same Apache 2.0 license as the main Sealos project.