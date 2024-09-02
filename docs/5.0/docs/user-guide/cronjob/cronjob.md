---
keywords: [CronJob, Sealos, task scheduling, Kubernetes, automation]
description: Learn how to set up and manage CronJobs in Sealos for automated task scheduling in Kubernetes. Step-by-step guide included.
---

# CronJob

CronJobs are used to execute tasks periodically according to a specified timetable.

## Quick Start

Open the Sealos desktop and click on CronJob.

![](./images/cronjob-1.png)

Click Add CronJob.

![](./images/cronjob-2.png)

Here, a CronJob is set up to set the number of instances of the nginx deployment to 0 every day at 12 PM.

Enter a custom Job name, set the time using a Cron expression, choose the Expansion and Contraction Launchpad type,
select nginx (the running nginx deployment) for the App name, set the replicas count to 0, and click Deploy.

![](./images/cronjob-3.png)

After successfully adding the CronJob, you can click Details to view the execution status of the job.

![](./images/cronjob-4.png)

The details page shows the number of successful and failed jobs, as well as the execution history of the jobs.

![](./images/cronjob-5.png)