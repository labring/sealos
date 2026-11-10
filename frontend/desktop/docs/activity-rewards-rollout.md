# KOL 邀请与活动奖励发布

本次修改覆盖 Sealos Web、Admin 与 sealox 客户端。sealos.run 不在范围内，现有邀请链接的域名和构造方式保持不变。

## 分两阶段升级

1. 先应用 Sealos Web 中新增的 global 数据库迁移，按目标数据库 provider 生成 Prisma 客户端，再部署兼容阶段提交 `d6f4b73f4`到所有 Web 副本、活动补偿 worker 和其他读取 `ActivityRewardGrant` 的服务。此阶段 `giftCodeId` 已可空、能读取直接入账记录，但新奖励仍生成旧兑换码，原有未完成兑换码继续走旧核销与对账。确认旧副本与旧 worker 全部退出后，再开放 Admin 的 KOL 规则设置和激活码发放。
2. 所有读方均已兼容后，部署兼容提交之后的直接入账阶段提交（提交说明为 `feat(activity): credit rewards atomically with transaction receipts`）。新的正金额奖励在一个 global 数据库事务内写入业务账本、增加 `Account.balance`、写入 `AccountTransaction`。0 元只保存注册时的规则快照和既有实名主体资格，不创建金额为 0 的流水或兑换码。

不能从迁移后的旧版本直接滚动到直接入账版本：旧 Prisma 客户端把 `giftCodeId` 视为非空，读到新记录会失败。直接入账阶段可以回退到兼容阶段，不能回退到兼容阶段之前的读方；已入账流水和账本不删除、不重新发放。

## 运行检查

- 注册时冻结邀请双方金额和规则版本；调整、停用邀请码只影响之后注册的关系。历史金额以原账本为准，迁移会保留已有奖励金额，无账本的旧关系按原 5/5 元补齐。
- KOL 必须先注册再登录客户端激活。激活不要求钱包初始化或邀请人实名。现有邀请码不更换，停用状态不因激活恢复。激活码只保存 SHA-256 摘要，原码仅运营创建时交付。
- 发奖需要既有 `Account` 且余额字段已初始化；缺失时整体回滚并等待原有初始化链路及 worker 重试。不会为已注册用户另建钱包。
- 直接奖励状态为 `REDEEMED`，`accountTransactionId` 指向 `ActivityReward` 资金流水，`giftCodeId` 为空。旧奖励保持原 `giftCodeId`，不会转为直接入账。
- 唯一业务键或实名主体占用冲突不能留下余额副作用。同业务键但接收人、类型、邀请关系或金额快照不一致时停止该次处理，保留原记录供排查。
- 金额单位为 1 元 = 1,000,000；接口使用十进制整数字符串传输。运营输入为非负整数元。

## 隔离验证

真实数据库测试只接受本机 `127.0.0.1/activity_test`，每个文件会清理该测试库业务表；同一个库内顺序运行，禁止连接生产库。通过 `ACTIVITY_TEST_DATABASE_URL` 和 `ACTIVITY_TEST_PROVIDER=postgresql|cockroachdb` 选择测试数据库。

```sh
pnpm exec vitest run src/__tests__/unit/backend/activity/kol.integration.test.ts
pnpm exec vitest run src/__tests__/unit/backend/activity/identity.integration.test.ts
pnpm test:ci
pnpm exec tsc --noEmit --pretty false
```
