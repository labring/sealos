# Detailed Billing System Description

## General Billing Method Explanation (Application, Database, Terminal)

| Billing Type | Description                                                                                                                                                       | Billing Rule                                               | Minimum Billing Unit (If less than 1 unit, charge as 1 unit) | Deduction Method |
|--------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------|------------------------------------------------------------|-----------------|
| CPU          | CPU usage is calculated every minute and billed based on the average hourly usage. For example, if a user uses 1 core (c) for the first 30 minutes of an hour and 2 cores for the next 30 minutes, the CPU usage for that hour would be 1.5 core hours (c/h), i.e., (30 minutes * 1 core + 30 minutes * 2 cores)/60 minutes = 1.5 core hours. | Hourly billing, current hour resource usage deducted in the next hour. | Milli-core (mCore)                                           | Balance deduction |
| Memory       | Memory usage is calculated every minute and billed based on the average hourly usage.                                                                             | Hourly billing, current hour resource usage deducted in the next hour. | Megabyte (MB)                                               | Balance deduction |
| Storage Volume | Storage usage is calculated every minute and billed based on the average hourly usage. No charge for private cloud deployment.                                   | Hourly billing, current hour resource usage deducted in the next hour. | Megabyte (MB)                                               | Balance deduction |
| Network      | Billed based on usage, no charge for private cloud deployment.                                                                                                     | Usage billing, current resource usage deducted in the next hour.      | Megabyte (MB)                                               | Balance deduction |
| TCP Port     | Port usage is calculated every minute and billed based on the average hourly usage. No charge for private cloud deployment.                                       | Usage billing, current resource usage deducted in the next hour.      | Unit                                                       | Balance deduction |

### Detailed Billing Prices

#### Public Cloud

##### Singapore (sgs)

| Name         | Unit     | Price  |
|--------------|----------|--------|
| CPU          | Core/year | 586.92 |
| Memory       | GB/year  | 296.02 |
| Storage Volume | GB/year | 17.94  |
| Network      | GB       | 0.8    |
| TCP External Port | Unit/year | 608   |

##### Hangzhou H (hzh)

| Name         | Unit     | Price  |
|--------------|----------|--------|
| CPU          | Core/year | 242.39 |
| Memory       | GB/year  | 122.25 |
| Storage Volume | GB/year | 7.40   |
| Network      | GB       | 0.80   |
| TCP External Port | Unit/year | 121   |

##### Beijing A (bja)

| Name         | Unit     | Price  |
|--------------|----------|--------|
| CPU          | Core/year | 150.01 |
| Memory       | GB/year  | 75.66  |
| Storage Volume | GB/year | 4.58   |
| Network      | GB       | 0.80   |
| TCP External Port | Unit/year | 61.32  |

##### Guangzhou G (gzg)

| Name         | Unit     | Price  |
|--------------|----------|--------|
| CPU          | Core/year | 152.59 |
| Memory       | GB/year  | 76.96  |
| Storage Volume | GB/year | 4.66   |
| Network      | GB       | 0.80   |
| TCP External Port | Unit/year | 61.32  |

#### Private Cloud

| Name         | Unit     | Price |
|--------------|----------|-------|
| CPU          | Core/year | 19.6  |
| Memory       | GB/year  | 9.8   |
| Storage Volume | GB/year | 0     |
| Network      | GB       | 0     |
| TCP External Port | Unit/year | 0     |

## Cloud Host Billing Method Explanation

### Configuration Cost Details

### Storage Costs

| Item         | Unit       | Price            |
|--------------|------------|------------------|
| Storage      | GiB/hour   | ¥0.0008/GiB/hour |

### Bandwidth Costs

| Range        | Unit       | Price            |
|--------------|------------|------------------|
| [0 , 5)      | Mbps/hour  | ¥0.05/Mbps/hour  |
| [5 , ∞)      | Mbps/hour  | ¥0.2/Mbps/hour   |

### Instance Costs

| Model     | CPU | Memory | GPU | Reference Cost   |
|-----------|-----|--------|-----|------------------|
| sealos-1  | 8C  | 64GB   | 0   | ¥2.2/hour        |
| sealos-2  | 16C | 128GB  | 0   | ¥4.4/hour        |
| sealos-3  | 32C | 256GB  | 0   | ¥8.8/hour        |

## User Overdue Payment Handling Process

### Overdue Periods

When a user's account is overdue, the following process will be followed:

+ **Warning Period**: When the account balance is less than 0, the user enters the warning period.
+ **Approaching Deletion Period**: On the 4th day after the warning period, or when the overdue amount exceeds half of the account balance, the user enters the approaching deletion period.
+ **Immediate Deletion Period**: On the 3rd day after the approaching deletion period, the user enters the immediate deletion period.
+ **Final Deletion Period**: On the 7th day after the immediate deletion period, if the account is still not recharged, the user enters the final deletion period.

### Overdue Payment Handling

+ **Warning Period**: Created applications are still billed and usable, and overdue notifications are sent to the user.
+ **Approaching Deletion Period**: Created applications are still usable, and an approaching deletion warning notification is sent to the user.
+ **Immediate Deletion Period**: User's created resources are suspended, and a confirmation of deletion warning notification is sent to the user.
+ **Final Deletion Period**: All resources of the user will be deleted and cannot be recovered during the final deletion period.

Throughout the overdue period, users will be unable to modify configurations or create new resources.

### Notification Method

We will notify users through internal notifications, and public cloud users will also receive SMS notifications when entering the overdue period. Please check and handle them in time.

### Notes

+ Please use resources reasonably to avoid overdue payments.
+ Please recharge in time after an overdue payment to avoid service disruption.
+ Once resources are deleted during the final deletion period, they cannot be recovered even after recharging.
+ If recharged before the final deletion, suspended resources can be automatically restored after resolving the overdue status.