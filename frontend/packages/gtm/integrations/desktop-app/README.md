# Desktop App → 现有 Web GTM

这份**增量配置**将海外 App 事件送到已有 `GTM-5DTRN2V3` → `G-YF5VHZSTE0`，并在控制台记录官网访客与登录账号的关联。国内继续使用原 Rybbit。无需 sGTM、MP 密钥或新增数据库。

## 配置包含什么

仅新增 `Sealos Desktop App | ` 命名空间下的 3 个标签、3 个触发器和配套变量。现有官网、Desktop Web 标签及其触发器保持原样。

| 标签 | 入口 | 限定范围 |
| --- | --- | --- |
| App Google tag | `sealos_app_init` | 真正的 `http://127.0.0.1:<port>/desktop-app-analytics/<32hex>/index.html`、`surface=desktop_app`、`product_edition=global`、`analytics_consent=granted` |
| App GA4 event | `sealos_app_event` | 同上，且事件名在白名单中 |
| Web visitor linked GA4 | `web_visitor_linked` | HTTPS `*.sealos.io` 控制台（排除根域和 `www`）、global、granted、有效访客和账号 UUID |

App 主界面继续使用 `file://`；统计页是 App 主进程启动的本地 HTTP 服务提供的隔离页面，不是公网服务。触发器读取真正的 `location`，不使用可覆盖的 GA `page_location`。App 主进程还必须拦截非目标 GA4 的数据请求；GTM 触发器不是网络权限控制。当前公开 Google tag 还观察到过另一目的地 `G-CBY1489EF6`，归属未核对，必须阻断。

## 与代码的契约

App 主进程在加载 GTM **之前**和每条事件之前设置 Google tag 配置：

```js
// gtag 使用标准 dataLayer.push(arguments) 队列，不能 push 普通数组代替。
gtag('set', {
  client_id: '<Main 生成的 decimal.decimal>',
  user_id: '<已验证账号 UUID，未登录为 null>',
  session_id: '<会话 ID，基础模式为 null>',
  send_page_view: false,
  page_location: 'https://sealos.io/desktop-app'
});
```

初始化推送 `sealos_app_init`；后续仅用 `sealos_app_event`。字段为：

```js
dataLayer.push({ analytics_properties: null, source: null });
dataLayer.push({
  event: 'sealos_app_event',
  app_event_name: 'login_succeeded',
  surface: 'desktop_app', product_edition: 'global', analytics_consent: 'granted',
  client_id: '123456789.1234567890', user_id: '<UUID 或 null>',
  session_id: 1234567890, event_id: '<事件 ID>', detailed: true,
  analytics_properties: { method: 'oauth', outcome: 'success' },
  visitor_id: '<官网 Cookie UUID 或 null>',
  web_client_id: '<官网原 GA client ID 或 null>',
  source: { source: 'google', medium: 'cpc', campaign: 'example' }
});
```

所有可选字段必须每次显式写 `null`，包括无来源时的整个 `source`。每条事件都先清空 `analytics_properties` 和 `source`，再写入本次对象，避免 GTM Data Layer v2 深合并保留前一事件的属性或 `medium`、`campaign`。只在没有来源时置 `source=null` 仍会使两个不同来源对象发生残留。

允许的 App 事件：`app_launch`、`app_first_open`、`app_screen_view`、`login_required`、`login_started`、`login_succeeded`、`login_failed`、`task_created`、`task_opened`、`deploy_finished`、`visitor_linked`。GA4 事件名取自 `app_event_name`，不把 `sealos_app_event` 当业务事件发送。

Main 白名单属性为：`screen_name`、`outcome`、`reason`、`duration_ms`、`app_version`、`os`、`arch`、`env`、`packaged`、`flow`、`method`、`service_kind`、`template_id`、`workspace_id`、`engagement_time_msec`。模板只映射这些字段及身份关联、会话、版本、事件字段，总共 25 个参数。`source.{source,medium,campaign}` 映射成自定义 `acquisition_*`，**不代表自动恢复 GA 默认广告归因**。

`user_id` 必须是 Google tag 的 `set/config` 设置，不是普通 GA4 事件参数；模板不重复映射它。`client_id` 由 App 设置，`web_client_id` 只用于关联，不覆盖 App 实例 ID。详见 [Google User-ID 文档](https://developers.google.com/analytics/devguides/collection/ga4/user-id?technology=tagmanager)。

控制台完成服务端身份确认后，先执行 `gtag('set', { user_id: verifiedUserUid })`，再推送：

```js
dataLayer.push({ source: null });
dataLayer.push({
  event: 'web_visitor_linked',
  user_id: '<服务端确认的 UUID>', visitor_id: '<Cookie UUID>',
  product_edition: 'global', analytics_consent: 'granted',
  ga_client_id: '<浏览器原 GA client ID 或 null>', source: null
});
```

该事件以 GA4 `visitor_linked` 上报，`surface=desktop_web`。保留浏览器当前 GA client ID，不设置 App 的 CID、不改写 `_ga`。账号退出/切换时页面代码负责清理 `user_id`；模板不能代替认证状态管理。浏览器 Cookie 是营销上下文，不能用来决定认证账号或广告同意。

App 广告存储、广告用户数据、广告个性化始终 denied。基础模式在 App 代码中采用 analytics_storage denied、逐事件临时 CID、无账号/来源字段；详细模式才启用稳定实例 ID、账号及已同意的 Cookie 上下文。模板的 `analytics_consent=granted` 表示用户允许 App 基础统计，不自动将 Google analytics_storage 改为 granted，也不继承 Cookie 的广告授权。GTM 不负责这段同意初始化，必须由隔离页在 GTM 之前完成。

## 生成、核对、导入

在本目录运行（fish / zsh 均可）：

```sh
node generate.cjs
node --test generate.test.cjs
```

生成的 `container.patch.json` 仅包含新增实体。基础标签和事件表结构取自现有容器官方导出；测试覆盖范围隔离、事件白名单、参数与引用完整性。**尚未在 GTM 官方导入器和 Preview 中验证，不能把 JSON 测试通过当作上线验收。线上容器未修改、未发布。**

1. 在现有 **Web** 容器 `sealos.io` / `GTM-5DTRN2V3` 创建独立工作区，先导出备份。不要导入新建的 Server 容器。
2. 管理 → 导入容器 → 选择 `container.patch.json` → 选择该工作区 → **合并**。先检查差异，只允许新增上述命名空间实体。若有同名或 ID 冲突，停止并核对；不得选择覆盖容器或删除原标签。
3. 在导入预览检查 3 个标签类型、GA4 ID、DLV2 变量和自定义事件过滤器。Google tag 应为 `G-YF5VHZSTE0`，无自动 page_view 配置；它依赖上面的 App `gtag('set')` 契约。
4. 在 App 的真实隔离页预览：初始化一次；每个业务事件恰好发一次；实际请求 `tid=G-YF5VHZSTE0`、CID/UID/session 与模式吻合、无本地文件路径、无敏感自由文本。用拦截 collect 的测试会话核对参数，避免测试数据进入正式报表。
5. 验证官网和 Desktop Web 原事件保持原行为，新增 App 标签不触发；用同浏览器从官网 Cookie 经 OAuth 完成登录，检查 Web 原 CID 与 App 新 CID 分别保留、UID 一致，Cookie 缺失/拒绝/跨 realm 时不产生关联。
6. 基础/关闭/退出/切换账号和中国/全球切换各验一次，确认不会继承之前的账号、来源或广告同意；原有第三方标签不得获得 App 出网权限。最后按正常 review 流程提交发布。

若导入器报告字段错误，应修复本补丁再重新导入；不要临时改旧标签。新配置尚未发布时，App 不会通过原来的 Web 主机名触发器上报这些 App 业务事件。
