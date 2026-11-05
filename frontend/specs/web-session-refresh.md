# 第一方 Web 登录续期

普通 Web 登录只取得有限期 global、regional 和 app token，`request.ts` 在业务 401 时直接清会话跳转；没有独立的长期身份依据，所以全套访问凭证过期后无法恢复。这是本次修复的 Web 根因，不据此推断其他机器的原生客户端故障。

## 决定

- Web 登录完成区域初始化时，通过第一方 global token 建立 host-only、HttpOnly、Secure 的数据库会话 cookie。只接受服务端签发的 `global-auth` access token，禁止原生或第三方 OAuth token 升级。
- 登录入口调用 `loginSessionConfig` 建立长期会话；工作空间切换只调用 `sessionConfig`，不依赖内存中的旧 global token 再认证。
- 配置新工作空间时，使用独立请求实例携带新区 regional token 读取用户和套餐信息；全局 store 保持原来完整的凭证，加载成功后一次提交 regional token、app token、KC 和用户/workspace。失败保留原状态。
- 配置期间使用内存中的操作代际隔离续期；开始配置前的续期、配置期间新发起的认证失败、已退出或被新配置替代的结果都不能写回。每个代际独立合并续期请求，旧请求结束不能清掉新代际的在途请求。
- 使用已有 OAuthRefreshSession 和 OAuthCodeRefreshToken 的存储，独立 clientId、cookie 和 token 前缀隔离，不要求启用 OAuth IdP，不创建 OAuthClient，不新增数据库字段。
- Web cookie 是第一方数据库会话句柄，固定 30 天到期；有效的同账号会话可复用，否则新建。续签访问 JWT 时不消费或轮换该 cookie，成功或失败均不写 cookie，避免多标签、响应丢失和迟到失败覆盖新登录。服务端存 SHA-256 哈希，主动退出撤销会话。原生 OAuth refresh 的一次性轮换语义不变。
- `/api/auth/session` 建立会话，`/api/auth/session/refresh` 按当前 workspace 重新检查账号和成员关系，再签发 global、regional、app token 并读取现有 KC；只读 KC，不触发集群证书或 Secret 轮换。`/api/auth/session/logout` 撤销当前会话。所有接口仅 POST 同源 JSON，禁止缓存并限流。
- 刷新 cookie 不返回给 JavaScript，不放 localStorage、URL 或 SDK。保持原有访问 JWT 格式与有效期，OIDC 技术方案和第三方 KC 后置决定不变。
- Web 请求先经唯一恢复 owner 续期，再决定是否跳登录。并发合并，迟到结果不能覆盖换账号、退出或切 workspace 后的状态。只自动重试 GET、HEAD 和只读 checkStatus 一次；写请求不自动重放。
- 403、网络和 5xx 保留登录。刷新会话明确无效才统一清理。主动退出调用服务端撤销；既有 JWT 和 KC 不承诺即时全局失效。
- 旧登录尚无 cookie 的用户需要在已有有效第一方登录流程中建立会话，或重新登录一次；禁止用过期 token 凭空建立刷新会话。

## 验收

1. 真实请求拦截器收到过期业务 401 或 HTTP 401 后恢复凭证，checkStatus 用新 regional token 和新 KC 重试，不跳 signin。
2. 并发读取只发起一次恢复；写请求不会因刷新重复执行。
3. 同源、第一方身份、固定到期、撤销、账号状态和 workspace 成员检查均有效；跨源及其他 OAuth client 不能取得 Web 会话。
4. 网络/权限错误不退出，logout/切账号/切 workspace 期间的迟到响应不覆盖新状态。
5. 在独立 PostgreSQL 上验证真实会话持久化、撤销和跨请求续期；既有 OAuth 授权码与设备流测试回归通过。
6. 执行真实 `sessionConfig` 的交错回归：挂起用户/套餐信息，期间触发认证失败、退出或另一工作空间配置；最终内存和持久化的 token、session、app token、KC 必须属于同一工作空间。旧 global proof 过期不阻断有效工作空间切换，登录入口仍拒绝失效证明。

测试入口：`pnpm --dir desktop exec vitest run src/__tests__/unit/services/session-expiry.test.ts src/__tests__/unit/backend/auth/web-session.test.ts --project unit`；类型检查：`pnpm --dir desktop exec tsc --noEmit`。
