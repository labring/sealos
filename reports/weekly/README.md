# Sealos Weekly Community Reports

This directory contains automatically generated weekly reports of community activity for the Sealos project.

## Report Structure

- **Date Range**: Each report covers activity from Sunday to Saturday
- **File Format**: `YYYY-MM-DD-weekly-report.md` (dated with the end of the week)
- **Content**: PR statistics, issue activity, contributor highlights, and community metrics

## Automated Generation

Reports are automatically generated every Monday via the `weekly-report.yml` GitHub Action workflow.

## Manual Generation

To manually generate a report for a specific week, use:

```bash
bash scripts/weekly-report.sh YYYY-MM-DD
```

Where `YYYY-MM-DD` is the end date (Saturday) of the week you want to report on.