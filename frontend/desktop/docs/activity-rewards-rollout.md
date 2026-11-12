# KOL 邀请与活动奖励发布

本次修改覆盖 Sealos Web、Admin 与 Sealos 客户端。现有邀请链接的构造方式保持不变。

## 统一更新

本次按可接受短暂停机、全部服务统一更新的方式发布，不支持新旧 Web 副本或补偿 worker 混跑。

1. 暂停所有读写活动奖励的旧 Web 副本及补偿 worker，确认它们已经退出，备份 global 数据库并保存当前镜像摘要。
2. 按目标数据库 provider 执行 global 迁移，包含原 KOL 迁移和追加的 `20261112000000_activity_reward_retry`，生成对应 Prisma 客户端。不要修改已经应用的迁移。非负约束遇到历史脏数据会中止；先核查来源，不自动改写历史金额。
3. 全部启动新版 Web 与补偿 worker，验证数据库、登录、激活、零元状态、余额和资金流水后恢复流量及运营发码。

新版直接奖励的 `giftCodeId` 可以为空。历史旧版 Prisma 读方无法读取这些记录，因此发生故障时先暂停服务并修复，不直接回退到 `giftCodeId` 非空的旧版本。已经发放的资金和永久实名占用不删除、不重发。

## 资格和资金分开

- 复用 `ActivityRewardGrant` 的 `READY` / `RETRYABLE_FAILURE` 保存已达标但尚未到账的奖励意图；首登记录同时永久占用实名摘要。钱包缺失不撤销资格，不补建钱包，也不阻塞邀请人自己的款项。
- 三种正金额奖励分别执行。每笔余额增加、`AccountTransaction` 和奖励状态转为 `REDEEMED` 在同一个 Serializable 事务中提交或回滚。重试原有业务键，不新增第二笔钱。
- 失败的直接奖励保留尝试时间和次数，由原 worker 退避重试。创建奖励意图之前就失败的关系，通过 `RegistrationReferral.rewardCheckedAt` 轮转；后台和在线入口共用同一个条件认领方法。
- 注册时冻结双方金额和规则版本；调整、停用邀请码只影响之后注册的关系。0 元只显示 `no_reward`，不创建 0 元流水或奖励意图。
- KOL 必须先注册，再登录客户端激活；不要求邀请人实名或钱包初始化。原邀请码保持不变。激活码只保存 SHA-256 摘要，原码仅运营创建时交付。
- 旧兑换码奖励继续核销原码并对账。`giftCodeId=null` 的待到账记录只走直接入账，不调用兑换服务。

## 隔离验证

真实数据库测试只接受本机 `127.0.0.1/activity_test`，每个文件会清理该测试库业务表；同一个库内顺序运行，禁止连接已有集群或生产库。通过 `ACTIVITY_TEST_DATABASE_URL` 和 `ACTIVITY_TEST_PROVIDER=postgresql|cockroachdb` 选择测试数据库。

本地验证使用临时 PostgreSQL 16 和 CockroachDB 24.3，分别应用完整迁移并串行运行以下两份集成测试；数据库地址不能为空。数据库测试、普通单测和类型检查均通过后再合并。

```sh
pnpm exec vitest run --project unit --maxWorkers=1 --no-file-parallelism src/__tests__/unit/backend/activity/kol.integration.test.ts src/__tests__/unit/backend/activity/identity.integration.test.ts
pnpm test:ci
pnpm exec tsc --noEmit --pretty false
```
