# Sealos Desktop 新增授权码 + PKCE，保持设备流不变

状态：已进入实现阶段，按本规格的 API、数据库并发和浏览器边界验证；未发布 Issue。

## Problem Statement

Sealos Desktop 授权服务目前通过设备流向原生客户端签发凭证。桌面端和手机端需要在系统浏览器完成登录、确认授权后自动返回应用，而不依赖轮询获取登录结果。

当前同名 authorize 页面只是设备流页面跳转入口；token 接口仅支持设备码和刷新令牌。现有设备流已经有客户端使用，本次必须保持其请求、响应、页面行为、刷新语义与配置兼容。

本规格中的 Sealos Desktop 指本仓库的 Web Desktop 与授权服务；桌面 App、手机 App 是使用该服务的 public clients。原生客户端产品代码迁移不属于本仓库交付，使用参考客户端验证可接入性。

## Solution

在现有授权服务中新增 OAuth 2.0 Authorization Code + PKCE（仅 S256）。原生客户端通过系统浏览器发起请求，用户登录并确认应用信息后，浏览器携带短期一次性 code 回到已注册的应用回调，客户端提交 code_verifier 换取 access token 和 refresh token。

新流程提供可轮换、可撤销的 refresh token。设备流及其已有 token 继续按原有方式工作。本次不实现 OIDC，不返回 ID token，也不新增细粒度 scope 或工作空间选择。

## User Stories

1. As a 桌面端用户, I want 在浏览器中使用 Sealos 账号登录并自动返回应用, so that 无需等待设备码轮询。
2. As a 手机端用户, I want 使用系统认证浏览器完成相同授权流程, so that 手机与桌面共享一套服务端协议。
3. As a 已登录用户, I want 复用浏览器中的 Sealos 登录态, so that 无需重复输入登录凭证。
4. As a 未登录用户, I want 登录后继续原来的授权请求, so that 无需重新从客户端发起。
5. As a 用户, I want 看到授权应用名称、图标与当前账号, so that 能确认自己在授权哪个应用。
6. As a 用户, I want 明确看到本次授予的是现有账号访问能力, so that 不会误以为存在尚未实现的细粒度权限限制。
7. As a 用户, I want 拒绝后返回应用并得到明确结果, so that 应用不会一直显示登录中。
8. As a 用户, I want 授权过期后得到重新发起的提示, so that 可以恢复登录。
9. As a 用户, I want 凭证过期前由应用刷新访问令牌, so that 不必频繁登录。
10. As a 用户, I want 应用退出时能够撤销本次登录的刷新凭证, so that 该登录会话不能继续续期。
11. As a 多设备用户, I want 一次会话撤销不影响其他会话, so that 可独立管理设备登录。
12. As a 原生客户端开发者, I want 通过 client_id 和 PKCE 接入, so that 不必在安装包内保存通用 client secret。
13. As a 原生客户端开发者, I want 获得标准 code、state 和 OAuth 错误响应, so that 可以使用成熟客户端实现接入。
14. As a 原生客户端开发者, I want 授权码与客户端、回调地址和 PKCE 绑定, so that 截获授权码的其他应用无法兑换。
15. As a 原生客户端开发者, I want code 只能成功兑换一次, so that 重试和并发请求不会产生多个有效凭证集。
16. As a 原生客户端开发者, I want 明确的刷新轮换和撤销契约, so that 能正确保存最新凭证并处理重新登录。
17. As a 平台管理员, I want 为桌面端和手机端配置独立客户端与回调白名单, so that 可以分别控制接入范围。
18. As a 平台管理员, I want 未显式启用授权码的客户端无法使用新流程, so that 现有注册不会获得额外能力。
19. As a 设备流用户, I want 原来的设备码、确认页面和轮询流程完全保持兼容, so that 客户端无需升级。
20. As a 设备流客户端开发者, I want 已签发 token 和刷新机制不受影响, so that 发布新功能不会迫使用户重新登录。
21. As a 维护者, I want 新数据结构增量上线且已有客户端配置无需修改, so that 可以安全发布和回退入口。
22. As a 维护者, I want 使用公开协议行为验证两种流程共存, so that 测试不会依赖内部函数拆分。

## Implementation Decisions

- 范围采用上述服务端定义；本次实现以此规格为依据。
- 保留现有 OAuth2 IdP 总开关；新授权码入口增加默认关闭的独立开关。关闭新入口阻止新授权，不改变设备流；已签发新刷新凭证仍可刷新或撤销，除非管理员关闭整个 IdP。
- OAuthClient 增加默认空的回调 URI 白名单；复用 allowedGrantTypes 显式授权 `authorization_code` 与 `refresh_token`。现有客户端不自动获得新 grant。首期新流程仅支持 PUBLIC client。
- 提供独立的标准授权 API 入口，接收 `response_type=code`、client_id、redirect_uri、state、code_challenge、code_challenge_method。要求非空 state，PKCE 仅接受 S256；校验参数格式、长度以及重复关键参数。
- 保留现有设备流 authorize/login/consent 路由语义。新授权请求使用独立的请求类型和登录续接上下文，不复用设备 grant 的 request_id 或用户验证码；只复用底层账号登录能力及可安全复用的展示组件。
- 验证 client 和 redirect_uri 后才允许向回调地址返回结果。无效客户端或未注册回调在 Sealos 页面报错，禁止跳转到未验证的 URI；其余协议错误按 OAuth 契约返回，成功和拒绝都原样返回 state。
- 回调 URI 禁止通配符与 fragment。支持注册的 HTTPS URI、具有反向域名形式的原生应用私有 scheme；桌面端可注册 loopback IP 回调，只允许动态端口例外，其余 URI 严格匹配。禁止任意非 loopback HTTP 回调。
- 授权请求以服务端记录保存，10 分钟有效；登录和确认阶段均重新检查有效性。最终同意绑定已认证用户并原子化转移状态；拒绝或已完成的请求不能再次批准。
- 新确认页显示应用名称、图标、当前用户和现有账号访问能力说明，提供同意/拒绝。首期每次显示确认，不引入自动同意或新账号切换流程。授权决策要求有效登录态和 CSRF 防护。
- 用户同意后生成高熵、不透明、5 分钟有效的授权码；仅存哈希，绑定用户、client_id、原始 redirect_uri、S256 challenge 和授权会话。回调 URL 仅携带 code/state 等协议字段，绝不携带 access/refresh token。
- 扩展现有 token endpoint 的 grant 分派，新增 `authorization_code`，接收 code、client_id、redirect_uri、code_verifier，支持标准 form-urlencoded。严格验证 verifier 为 43–128 个 RFC 7636 允许字符，并比较 S256 结果。
- 授权码兑换通过数据库条件更新和事务原子消费；并发请求最多一个成功。code 过期、重复消费、客户端/回调/PKCE 不匹配统一按契约返回 invalid_grant；缺少参数为 invalid_request，未授权 grant 为 unauthorized_client。
- 成功响应复用 access_token、refresh_token、token_type=Bearer、expires_in；access token 沿用当前全局凭证格式与 1 小时有效期，兼容既有 API 验证链路，不返回 id_token。
- 本期新授权码请求不支持非空 scope，返回 invalid_scope；省略或空值表示现有账号访问能力。不得宣传 openid、offline_access 或 workspace 权限隔离；设备流原有 scope 处理保持原样。
- 新授权码流程签发独立格式的高熵 opaque refresh token，保存哈希、用户、客户端、会话族、过期和撤销状态。每次刷新原子地消费旧值并返回新值，30 天滑动有效期；重复使用已消费值拒绝并撤销对应会话族，客户端须串行刷新。
- 新 refresh token 通过独立标识路由到新验证分支，失败不得降级到旧验证逻辑；旧设备流 JWT refresh token 继续走原分支，保持其 grant 检查、有效期、错误与签发行为。
- 新增遵循 RFC 7009 响应约定的 refresh token 撤销接口，作用于新流程的单个会话族；绑定 client_id，重复或无效 token 返回成功且不泄露状态。不新增设备流撤销行为。
- 撤销阻止未来刷新，不承诺已签发 access token 立即失效；现有 access token 最长继续有效 1 小时。撤销也不使已导出的 kubeconfig 失效，此限制必须在接入说明明确说明。
- 对新增请求和 token 增加到期清理机制；授权及 token 响应禁缓存，日志不记录原始 code、verifier 或 token。新入口配置独立频率限制，不改变设备接口限流行为。
- 同步维护项目现有全局数据库各 provider schema、迁移及生成类型。只增加字段/表，不迁移或重写 OAuthDeviceGrant 和已有 OAuthUserConsent 数据。
- 提供桌面 loopback 和移动端回调契约示例，要求客户端使用系统浏览器、验证 state、保存最新 refresh token；回调方案与具体平台关联配置由各原生客户端落实。

## Testing Decisions

- 测试边界：以现有 OAuth API handler 的请求/响应作为主要边界，验证真实 service 和 PKCE 行为，不 mock 被测授权服务；只在数据库、时间和外部登录身份等边界提供替身。已有 handler 单测大量 mock service，不把它们单独当作新流程安全保证。
- 优先沿用现有 Vitest、OAuth2 IdP 的 token/authorize/device/API headers 测试模式。保持现有设备流测试与行为断言，不通过修改旧期望使新实现通过。
- 主契约覆盖：有效请求、未登录续接、批准、拒绝、state 回传、form-urlencoded 换码、可用 access token、刷新、撤销，以及开关关闭和不具备 grant 的客户端。
- 负向契约覆盖：错误/未注册回调、URI 通配和 fragment、参数重复、非 S256、缺少或非法 verifier、错误 challenge、错误 client、redirect 不匹配、过期、code 重放、不支持的 scope、未认证/CSRF 授权决策。
- 增加少量通过同一 API 边界运行的真实数据库集成测试，验证并发批准/换码至多一次成功、并发刷新和重放后的会话族状态、事务失败无部分签发。纯 mock 无法证明数据库原子性；隔离数据库与迁移准备属于该测试工作的必要部分。
- 设备流回归验证原请求/响应、验证码和 request_id 跳转、登录续接、同意/拒绝、轮询间隔与 pending/slow_down/expired 错误、token 格式与旧 refresh 行为。包含仅设备 grant 的旧客户端、双 grant 客户端和新增字段默认空的旧记录。
- 浏览器层只补必要的可观察行为验证：新流程登录后回到正确请求、展示账号和应用、批准/拒绝回调；设备流仍显示原完成页面。复用现有浏览器组件测试基础，集成烟测通过参考客户端接收真实回调，不宣称完成了原生 App 产品迁移。
- 测试断言 HTTP 状态、协议字段、跳转目的地、凭证可用性及会话撤销结果，不断言私有 helper、SQL 调用顺序或组件内部状态。
- 接入验收必须实际证明：新 access token 能访问现有授权业务接口；新 refresh 撤销后不可续期；设备流旧 token 仍可正常刷新。不得仅以生成了 token 字符串为验收通过。

## Out of Scope

- OIDC、ID token、UserInfo、Discovery、JWKS、openid/profile/email scope。
- 新增业务 scopes、工作空间选择、权限委托模型或 kubeconfig 权限收敛。
- 任何设备流协议、UI、数据状态机、刷新策略及既有授权记录语义变化；已有设备流潜在问题另开任务处理。
- 原生桌面端和手机端产品代码改造、打包发布及平台深链配置；本次只提供服务能力与接入验证。
- Confidential client 的新授权码接入、Client Credentials、Implicit 和 Password Grant。
- 完整开发者应用注册平台、已授权应用管理 UI、跨设备登出、access token 即时撤销及 kubeconfig 撤销。
- PAR、动态客户端注册、自动跳过确认和整个登录/授权 UI 重设计。

## Further Notes

- 不把 Railway 的权限页外观等同于 OAuth 协议支持；本期页面准确表达实际已有访问能力。
- 新流程的撤销/轮换仅作用于新 refresh 会话，避免用全局刷新改造破坏“设备流不变”的约束。
- 未发现该授权模块可适用的领域词汇表或 ADR；沿用当前 OAuthClient、OAuthDeviceGrant、OAuthUserConsent 与全局/区域凭证术语。
- 尚未提供或找到明确 Issue tracker 与分诊配置；Git remote 同时包含个人 fork 和上游，不能据此确定发布位置。按 to-spec 技能要求，发布前运行 `/setup-matt-pocock-skills`。用户后续已要求进入实现；Issue 发布留待单独配置，不阻塞本次实现。
- 标准参考：[RFC 8252 原生应用](https://www.rfc-editor.org/rfc/rfc8252)、[RFC 7636 PKCE](https://www.rfc-editor.org/rfc/rfc7636)、[RFC 6749 OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749)、[RFC 7009 撤销](https://www.rfc-editor.org/rfc/rfc7009)、[RFC 9700 安全最佳实践](https://www.rfc-editor.org/rfc/rfc9700.html)。
- 产品参考：[Railway 登录与 Token](https://docs.railway.com/integrations/oauth/login-and-tokens)、[Google 原生应用授权](https://developers.google.com/identity/protocols/oauth2/native-app)、[Microsoft 授权码流程](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)。
