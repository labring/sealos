# Image-CRI-Shim 缓存镜像逻辑优化方案（含完整测试）

## 当前问题分析
当前的 `rewriteImage` 函数存在以下问题：
1. 每次调用都会执行完整的替换逻辑，没有缓存机制
2. 总是先尝试 Offline 配置，失败后再尝试 CRI 配置
3. 频繁的外部 registry 调用影响性能

### 当前实现
```go
func (s *v1ImageService) rewriteImage(image, action string) (string, bool, *rtype.AuthConfig) {
    newImage, ok, auth := replaceImage(image, action, s.authStore.GetOfflineConfigs())
    if ok {
        return newImage, true, auth
    }
    registries := s.authStore.GetCRIConfigs()
    if len(registries) == 0 {
        return image, false, nil
    }
    return replaceImage(image, action, registries)
}
```

## 优化目标
1. **优先域名匹配**：当镜像前缀匹配配置的 domain 时，优先使用 domain 检测
2. **智能匹配顺序**：先尝试精确的 domain 匹配，再使用 fallback 到 Offline 配置
3. **缓存机制**：缓存匹配结果，避免重复的外部调用

## 实施方案

### 1. 核心结构修改
在 `v1ImageService` 中添加缓存字段：
- `imageCache`：缓存镜像重写结果
- `domainCache`：缓存域名匹配结果
- `cacheMutex`：保证并发安全

```go
type v1ImageService struct {
    imageClient api.ImageServiceClient
    authStore   *AuthStore
    // 新增缓存字段
    imageCache   map[string]cacheEntry
    domainCache  map[string]string
    cacheMutex   sync.RWMutex
    maxCacheSize int
}

type cacheEntry struct {
    newImage string
    auth     *rtype.AuthConfig
    found    bool
    expiry   time.Time
}
```

### 2. 修改 rewriteImage 逻辑
新的匹配流程：
1. 首先检查缓存
2. 提取镜像的 domain 部分
3. 优先在 CRI 配置中查找精确的 domain 匹配
4. 如果没找到，再尝试 Offline 配置
5. 缓存匹配结果

```go
func (s *v1ImageService) rewriteImage(image, action string) (string, bool, *rtype.AuthConfig) {
    // 1. 检查缓存
    if entry, found := s.getCachedResult(image); found {
        return entry.newImage, entry.found, entry.auth
    }

    // 2. 提取域名
    domain := extractDomainFromImage(image)

    // 3. 优先域名匹配
    if domain != "" {
        // 3.1 尝试 CRI 配置中的精确域名匹配
        if registries := s.authStore.GetCRIConfigs(); len(registries) > 0 {
            if matchingRegistry := s.findMatchingRegistry(domain, registries); matchingRegistry != nil {
                newImage, ok, auth := replaceImage(image, action, map[string]rtype.AuthConfig{domain: *matchingRegistry})
                s.cacheResult(image, newImage, ok, auth)
                return newImage, ok, auth
            }
        }
    }

    // 4. Fallback 到当前逻辑
    // 4.1 尝试 Offline 配置
    newImage, ok, auth := replaceImage(image, action, s.authStore.GetOfflineConfigs())
    if ok {
        s.cacheResult(image, newImage, ok, auth)
        return newImage, ok, auth
    }

    // 4.2 尝试所有 CRI 配置
    registries := s.authStore.GetCRIConfigs()
    if len(registries) == 0 {
        s.cacheResult(image, image, false, nil)
        return image, false, nil
    }

    newImage, ok, auth = replaceImage(image, action, registries)
    s.cacheResult(image, newImage, ok, auth)
    return newImage, ok, auth
}
```

### 3. 添加辅助函数

#### 域名提取函数
```go
func extractDomainFromImage(image string) string {
    // 使用现有的 registryFromImage 函数或增强版本
    parts := strings.SplitN(image, "/", 2)
    if len(parts) == 0 {
        return ""
    }

    // 处理特殊情况，如 docker.io/library/nginx
    domain := parts[0]
    if !strings.Contains(domain, ".") && !strings.Contains(domain, ":") {
        return "docker.io" // 默认域名
    }

    return domain
}
```

#### 域名匹配函数
```go
func (s *v1ImageService) findMatchingRegistry(domain string, registries map[string]rtype.AuthConfig) *rtype.AuthConfig {
    s.cacheMutex.RLock()
    if cached, found := s.domainCache[domain]; found {
        if cfg, exists := registries[cached]; exists {
            s.cacheMutex.RUnlock()
            return &cfg
        }
    }
    s.cacheMutex.RUnlock()

    // 精确匹配
    for regDomain, cfg := range registries {
        if strings.EqualFold(domain, regDomain) {
            s.cacheDomainMatch(domain, regDomain)
            return &cfg
        }
    }

    // 子域名匹配
    for regDomain, cfg := range registries {
        if strings.HasSuffix(domain, "."+regDomain) || strings.HasSuffix(regDomain, "."+domain) {
            s.cacheDomainMatch(domain, regDomain)
            return &cfg
        }
    }

    return nil
}
```

#### 缓存管理函数
```go
func (s *v1ImageService) getCachedResult(image string) (*cacheEntry, bool) {
    s.cacheMutex.RLock()
    defer s.cacheMutex.RUnlock()

    entry, found := s.imageCache[image]
    if !found {
        return nil, false
    }

    // 检查是否过期
    if time.Now().After(entry.expiry) {
        return nil, false
    }

    return &entry, true
}

func (s *v1ImageService) cacheResult(image, newImage string, found bool, auth *rtype.AuthConfig) {
    s.cacheMutex.Lock()
    defer s.cacheMutex.Unlock()

    // 限制缓存大小
    if len(s.imageCache) >= s.maxCacheSize {
        s.evictOldestCacheEntry()
    }

    s.imageCache[image] = cacheEntry{
        newImage: newImage,
        auth:     auth,
        found:    found,
        expiry:   time.Now().Add(30 * time.Minute), // 30分钟过期
    }
}

func (s *v1ImageService) cacheDomainMatch(imageDomain, registryDomain string) {
    s.cacheMutex.Lock()
    defer s.cacheMutex.Unlock()

    if len(s.domainCache) >= s.maxCacheSize/10 { // 域名缓存相对较小
        // 清理部分旧的域名缓存
        count := 0
        for k := range s.domainCache {
            if count >= s.maxCacheSize/20 {
                delete(s.domainCache, k)
                count++
            }
        }
    }

    s.domainCache[imageDomain] = registryDomain
}

func (s *v1ImageService) invalidateCache() {
    s.cacheMutex.Lock()
    defer s.cacheMutex.Unlock()

    s.imageCache = make(map[string]cacheEntry)
    s.domainCache = make(map[string]string)
}
```

### 4. 配置更新时的缓存清理
在 `AuthStore.Update` 方法中添加缓存清理回调：

```go
// 在 AuthStore 中添加观察者模式
type AuthStore struct {
    mu                sync.RWMutex
    criConfigs        map[string]rtype.AuthConfig
    offlineCRIConfigs map[string]rtype.AuthConfig
    observers         []func() // 观察者列表
}

func (a *AuthStore) AddObserver(observer func()) {
    a.mu.Lock()
    defer a.mu.Unlock()
    a.observers = append(a.observers, observer)
}

func (a *AuthStore) Update(auth *types.ShimAuthConfig) {
    a.mu.Lock()
    defer a.mu.Unlock()

    if auth == nil {
        a.criConfigs = map[string]rtype.AuthConfig{}
        a.offlineCRIConfigs = map[string]rtype.AuthConfig{}
        logger.Warn("received empty shim auth config, cleared cached registry credentials")
        a.notifyObservers()
        return
    }

    a.criConfigs = cloneAuthMap(auth.CRIConfigs)
    a.offlineCRIConfigs = cloneAuthMap(auth.OfflineCRIConfigs)
    logger.Info("updated shim auth config, registries: %d, offline: %d", len(a.criConfigs), len(a.offlineCRIConfigs))
    a.notifyObservers()
}

func (a *AuthStore) notifyObservers() {
    for _, observer := range a.observers {
        observer()
    }
}
```

## 测试用例设计

### 1. 单元测试文件
**`pkg/server/cri_server_v1_test.go`** - 核心逻辑测试

#### 基础功能测试
```go
func TestRewriteImage_DomainMatching(t *testing.T) {
    tests := []struct {
        name          string
        image         string
        criConfigs    map[string]rtype.AuthConfig
        offlineConfigs map[string]rtype.AuthConfig
        expectedFound bool
        expectedImage string
    }{
        {
            name:   "exact domain match",
            image:  "nginx:latest",
            criConfigs: map[string]rtype.AuthConfig{
                "docker.io": {Username: "user", Password: "pass"},
            },
            expectedFound: true,
            expectedImage: "registry.example.com/nginx:latest",
        },
        {
            name:   "subdomain match",
            image:  "my-registry.docker.io/nginx:latest",
            criConfigs: map[string]rtype.AuthConfig{
                "docker.io": {Username: "user", Password: "pass"},
            },
            expectedFound: true,
            expectedImage: "registry.example.com/nginx:latest",
        },
        {
            name:   "fallback to offline",
            image:  "nginx:latest",
            offlineConfigs: map[string]rtype.AuthConfig{
                "docker.io": {Username: "user", Password: "pass"},
            },
            expectedFound: true,
            expectedImage: "offline-registry.com/nginx:latest",
        },
        {
            name:           "no match found",
            image:          "nginx:latest",
            criConfigs:     map[string]rtype.AuthConfig{},
            offlineConfigs: map[string]rtype.AuthConfig{},
            expectedFound:  false,
            expectedImage:  "nginx:latest",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // 实现测试逻辑
        })
    }
}
```

#### 缓存机制测试
```go
func TestRewriteImage_Caching(t *testing.T) {
    service := setupTestService()

    // 首次调用 - 缓存未命中
    image, found, auth := service.rewriteImage("nginx:latest", "pull")
    // 验证外部调用被执行

    // 第二次调用 - 缓存命中
    image2, found2, auth2 := service.rewriteImage("nginx:latest", "pull")

    assert.Equal(t, image, image2)
    assert.Equal(t, found, found2)
    assert.Equal(t, auth, auth2)

    // 验证外部调用没有被重复执行
}

func TestRewriteImage_CacheExpiry(t *testing.T) {
    service := setupTestServiceWithShortTTL()

    // 首次调用
    service.rewriteImage("nginx:latest", "pull")

    // 等待缓存过期
    time.Sleep(2 * time.Second)

    // 再次调用应该触发外部调用
    // 验证缓存过期逻辑
}
```

#### 并发安全测试
```go
func TestRewriteImage_ConcurrentAccess(t *testing.T) {
    service := setupTestService()
    const numGoroutines = 100
    const numCalls = 10

    var wg sync.WaitGroup
    results := make(chan string, numGoroutines*numCalls)

    for i := 0; i < numGoroutines; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for j := 0; j < numCalls; j++ {
                image, _, _ := service.rewriteImage("nginx:latest", "pull")
                results <- image
            }
        }()
    }

    wg.Wait()
    close(results)

    // 验证所有结果一致
    var firstResult string
    for result := range results {
        if firstResult == "" {
            firstResult = result
        } else {
            assert.Equal(t, firstResult, result)
        }
    }
}
```

### 2. 集成测试文件
**`pkg/server/integration_test.go`** - 端到端测试

```go
func TestImageRewriteEndToEnd(t *testing.T) {
    // 模拟真实的 CRI 服务环境
    service := setupRealisticService()

    // 测试完整的镜像拉取流程
    req := &runtime.PullImageRequest{
        Image: &runtime.ImageSpec{
            Image: "nginx:latest",
        },
    }

    resp, err := service.PullImage(context.Background(), req)
    assert.NoError(t, err)
    assert.NotNil(t, resp)
}

func TestConfigurationUpdate(t *testing.T) {
    service := setupTestService()

    // 初始配置
    authStore := service.authStore
    authStore.Update(&types.ShimAuthConfig{
        CRIConfigs: map[string]types2.AuthConfig{
            "docker.io": {Username: "olduser", Password: "oldpass"},
        },
    })

    // 执行重写
    image1, _, _ := service.rewriteImage("nginx:latest", "pull")

    // 更新配置
    authStore.Update(&types.ShimAuthConfig{
        CRIConfigs: map[string]types2.AuthConfig{
            "docker.io": {Username: "newuser", Password: "newpass"},
        },
    })

    // 缓存应该被清理，使用新配置
    image2, _, _ := service.rewriteImage("nginx:latest", "pull")

    // 验证结果反映新配置
    assert.NotEqual(t, image1, image2)
}
```

### 3. 性能测试文件
**`pkg/server/benchmark_test.go`** - 性能对比

```go
func BenchmarkRewriteImage_WithoutCache(b *testing.B) {
    service := setupServiceWithoutCache()

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        service.rewriteImage("nginx:latest", "pull")
    }
}

func BenchmarkRewriteImage_WithCache(b *testing.B) {
    service := setupServiceWithCache()

    // 预热缓存
    service.rewriteImage("nginx:latest", "pull")

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        service.rewriteImage("nginx:latest", "pull")
    }
}

func BenchmarkRewriteImage_Concurrent(b *testing.B) {
    service := setupServiceWithCache()

    b.ResetTimer()
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            service.rewriteImage(fmt.Sprintf("nginx-%d:latest", rand.Intn(100)), "pull")
        }
    })
}
```

### 4. 边界条件测试

```go
func TestRewriteImage_EdgeCases(t *testing.T) {
    tests := []struct {
        name        string
        image       string
        expectError bool
    }{
        {"empty image", "", true},
        {"invalid image format", "not-a-valid-image", false},
        {"image with digest", "nginx@sha256:abc123", false},
        {"image with port", "localhost:5000/nginx:latest", false},
        {"complex image name", "registry.example.com:8080/path/to/app:v1.2.3", false},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            service := setupTestService()
            image, found, auth := service.rewriteImage(tt.image, "pull")

            if tt.expectError {
                assert.False(t, found)
            } else {
                assert.NotNil(t, image)
            }
        })
    }
}
```

### 5. 内存和缓存管理测试

```go
func TestCacheMemoryManagement(t *testing.T) {
    service := setupTestServiceWithSmallCache()

    // 填满缓存
    for i := 0; i < service.maxCacheSize+10; i++ {
        service.rewriteImage(fmt.Sprintf("image-%d:latest", i), "pull")
    }

    // 验证缓存大小不超过限制
    service.cacheMutex.RLock()
    cacheSize := len(service.imageCache)
    service.cacheMutex.RUnlock()

    assert.LessOrEqual(t, cacheSize, service.maxCacheSize)
}

func TestCacheInvalidation(t *testing.T) {
    service := setupTestService()

    // 填充缓存
    service.rewriteImage("nginx:latest", "pull")

    // 验证缓存存在
    _, found := service.getCachedResult("nginx:latest")
    assert.True(t, found)

    // 触发缓存失效
    service.invalidateCache()

    // 验证缓存已清理
    _, found = service.getCachedResult("nginx:latest")
    assert.False(t, found)
}
```

## 修改的文件清单

### 主要修改
1. `pkg/server/cri_server_v1.go` - 主要逻辑修改
   - 添加缓存字段到 v1ImageService 结构
   - 重写 rewriteImage 函数
   - 添加缓存管理方法

2. `pkg/server/utils.go` - 添加辅助函数
   - extractDomainFromImage 函数
   - 域名匹配相关函数

3. `pkg/server/auth_store.go` - 配置管理增强
   - 添加观察者模式支持
   - 配置更新时的回调机制

### 新增测试文件
4. `pkg/server/cri_server_v1_test.go` - 新增单元测试
   - 基础功能测试
   - 缓存机制测试
   - 并发安全测试
   - 边界条件测试

5. `pkg/server/integration_test.go` - 新增集成测试
   - 端到端流程测试
   - 配置更新测试
   - 真实环境模拟

6. `pkg/server/benchmark_test.go` - 新增性能测试
   - 缓存前后性能对比
   - 高并发场景测试
   - 内存使用监控

## 测试覆盖率目标
- 单元测试覆盖率 ≥ 90%
- 集成测试覆盖主要使用场景
- 性能测试验证优化效果
- 并发测试确保线程安全
- 边界条件测试保证健壮性

## 预期收益
- **性能提升**：减少外部 registry 调用，提升性能 50%+
- **精确度提升**：优化匹配逻辑，提高域名匹配精确度
- **资源节省**：缓存机制减少重复计算和网络调用
- **稳定性保证**：完整测试覆盖确保系统稳定性和可靠性
- **向后兼容**：保持现有 API 和行为兼容性

## 部署注意事项
1. **缓存大小配置**：根据实际使用情况调整 maxCacheSize
2. **过期时间设置**：根据镜像更新频率调整缓存 TTL
3. **内存监控**：关注缓存占用的内存大小
4. **性能监控**：添加缓存命中率指标监控
5. **回滚方案**：准备快速回滚到原始实现的方案