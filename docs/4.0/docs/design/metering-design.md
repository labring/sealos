# Metering Design Documentation

## **1、Background**

​    sealos cloud is a multi-tenant cloud operating system with k8s as the core. Each user has at least one namespace of his own to use, which brings challenges to billing. How to bill the cpu, memory and other resources used by users in k8s? How about billing traffic and other resources that are not visible to Metering.

## 2、Scenarios that need to be met

1. Metering and billing the cpu, memory and other resources of the pod being used
2. It can measure third-party resources (such as traffic) that Metering cannot perceive, and requires a resource access solution
3. Each controller needs to be idempotent
4. In case of emergencies, such as the Meterng-controller being hung up for 2 days, can the price deducted in these two days be restored normally

## 3、design ideas

### 3.1、Introduction of each module

Resource Controller: Statistical resource usage

Metering system: Calculate the price once in a billing cycle based on the statistical resource usage and the price list, let the user account deduct the money, and clear the statistical resource usage.

<img src="/docs/4.0/img/metering/metering-1.png" width="600px" height="300px" />

### 3.2、metering and billing process

3.2.1 Resource controller statistics process

<img src="/docs/4.0/img/metering/metering-2.png" width="600px" height="400px" />

3.2.2 The metering and billing system calculates the price based on the usage

​    The pricing will be calculated once within a billing cycle, and the resource usage within the measurement-based billing will be cleared. Finally, the required payment will be deducted from the user's account

<img src="/docs/4.0/img/metering/metering-3.png" width="600px" height="300px" />

## 4、the problems encountered

A controller needs to update multiple cr at the same time, so it cannot be idempotent

Detailed introduction: https://github.com/labring/sealos/discussions/2231

#### solution:

**Principle: Only one controller update per CR**

![](/docs/4.0/img/metering/metering-4.png)

Green represents the controller, and blue represents CR (that is, the instantiation of CRD)

1. The pod-controller statistical resource process: After the pod-controller counts the resource usage, it no longer changes the existing CR, but creates a Resource CR, which includes the resource usage and payable amount.

2. Metering-controller measurement process: watch Resource is generated, and the resource usage value will be put into the CR of Metering after generation.

3. Metering-controller billing process: After a billing cycle, according to the resource usage and payable amount counted in Metering CR, an AccountBalance CR is generated, which stores the amount to be deducted.

4. Deduction process: Account monitors the generation of Accountbalance CR, reads the value that needs to be deducted, and deducts the fee.