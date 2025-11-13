# Image-CRI-Shim 缓存优化完整实现方案（使用LRU库）

## 任务概述
优化 image-cri-shim 项目中的 `rewriteImage` 函数，实现高效的LRU缓存机制和域名优先匹配策略，解决当前O(n)复杂度性能问题。

## 当前问题分析
现有的 `rewriteImage` 函数存在以下问题：
1. **每次调用都执行完整替换逻辑**，没有缓存机制
2. **总是先尝试Offline配置**，失败后再尝试CRI配置
3. **频繁外部registry调用**，影响性能
4. **自实现缓存的O(n)复杂度**，淘汰算法效率低

## 核心优化要求

### 1. 使用成熟LRU库
- **依赖库**: `github.com/hashicorp/golang-lru v0.5.4`
- **性能要求**: O(1) 时间复杂度的缓存操作，替代原方案的 O(n) 复杂度
- **并发安全**: 利用库内置的线程安全特性
- **内存效率**: LRU算法提供更好的内存使用和淘汰策略

### 2. 优化匹配逻辑
- **域名优先匹配**: 当镜像前缀匹配配置的domain时，优先使用domain检测
- **智能匹配顺序**: 先尝试精确的domain匹配，再使用fallback到Offline配置
- **结果缓存**: 缓存匹配结果，避免重复的外部registry调用

### 3. 完整测试覆盖
- **单元测试**: 覆盖率 ≥ 90%，包含LRU特定测试场景
- **集成测试**: 端到端验证完整流程
- **性能测试**: Benchmark对比，验证O(1) vs O(n)优化效果
- **并发测试**: 确保多线程环境下的安全性

## 技术实现规格

### 核心结构设计
```go
import (
    "github.com/hashicorp/golang-lru"
    "sync"
    "time"
)

type v1ImageService struct {
    imageClient api.ImageServiceClient
    authStore   *AuthStore
    // LRU缓存字段 - 替代原有的map+手动淘汰
    imageCache   *lru.Cache    // 镜像重写结果缓存
    domainCache  *lru.Cache    // 域名匹配结果缓存
    maxCacheSize int
}

type cacheEntry struct {
    newImage string
    auth     *rtype.AuthConfig
    found    bool
    expiry   time.Time
}

type domainEntry struct {
    registryDomain string
    expiry        time.Time
}
```

### LRU缓存初始化
```go
func NewV1ImageService(imageClient api.ImageServiceClient, authStore *AuthStore) (*v1ImageService, error) {
    const (
        defaultImageCacheSize  = 1000  // 镜像缓存大小
        defaultDomainCacheSize = 100   // 域名缓存大小
    )

    imageCache, err := lru.New(defaultImageCacheSize)
    if err != nil {
        return nil, fmt.Errorf("failed to create image cache: %w", err)
    }

    domainCache, err := lru.New(defaultDomainCacheSize)
    if err != nil {
        return nil, fmt.Errorf("failed to create domain cache: %w", err)
    }

    service := &v1ImageService{
        imageClient:  imageClient,
        authStore:    authStore,
        imageCache:   imageCache,
        domainCache:  domainCache,
        maxCacheSize: defaultImageCacheSize,
    }

    // 注册配置更新观察者
    authStore.AddObserver(service.invalidateCache)

    return service, nil
}
```

### 重写后的 rewriteImage 逻辑
```go
func (s *v1ImageService) rewriteImage(image, action string) (string, bool, *rtype.AuthConfig) {
    // 1. 检查缓存 - O(1)操作
    if entry, found := s.getCachedResult(image); found {
        return entry.newImage, entry.found, entry.auth
    }

    // 2. 提取镜像domain
    domain := extractDomainFromImage(image)

    // 3. 优先域名匹配 - 精确匹配优先
    if domain != "" {
        if registries := s.authStore.GetCRIConfigs(); len(registries) > 0 {
            if matchingRegistry := s.findMatchingRegistry(domain, registries); matchingRegistry != nil {
                newImage, ok, auth := replaceImage(image, action, map[string]rtype.AuthConfig{domain: *matchingRegistry})
                s.cacheResult(image, newImage, ok, auth) // O(1)缓存
                return newImage, ok, auth
            }
        }
    }

    // 4. Fallback到当前逻辑
    // 4.1 尝试Offline配置
    newImage, ok, auth := replaceImage(image, action, s.authStore.GetOfflineConfigs())
    if ok {
        s.cacheResult(image, newImage, ok, auth)
        return newImage, ok, auth
    }

    // 4.2 尝试所有CRI配置
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

### O(1)复杂度的缓存操作
```go
func (s *v1ImageService) getCachedResult(image string) (*cacheEntry, bool) {
    value, found := s.imageCache.Get(image) // O(1)操作
    if !found {
        return nil, false
    }

    entry, ok := value.(*cacheEntry)
    if !ok {
        s.imageCache.Remove(image) // 清理无效缓存
        return nil, false
    }

    // TTL检查
    if time.Now().After(entry.expiry) {
        s.imageCache.Remove(image)
        return nil, false
    }

    return entry, true
}

func (s *v1ImageService) cacheResult(image, newImage string, found bool, auth *rtype.AuthConfig) {
    entry := &cacheEntry{
        newImage: newImage,
        auth:     auth,
        found:    found,
        expiry:   time.Now().Add(30 * time.Minute), // 30分钟TTL
    }

    s.imageCache.Add(image, entry) // O(1)操作，自动LRU淘汰
}

func (s *v1ImageService) getDomainFromCache(domain string) (string, bool) {
    value, found := s.domainCache.Get(domain) // O(1)操作
    if !found {
        return "", false
    }

    entry, ok := value.(*domainEntry)
    if !ok {
        s.domainCache.Remove(domain)
        return "", false
    }

    if time.Now().After(entry.expiry) {
        s.domainCache.Remove(domain)
        return "", false
    }

    return entry.registryDomain, true
}

func (s *v1ImageService) cacheDomainMatch(imageDomain, registryDomain string) {
    entry := &domainEntry{
        registryDomain: registryDomain,
        expiry:        time.Now().Add(60 * time.Minute), // 域名缓存1小时
    }

    s.domainCache.Add(imageDomain, entry) // O(1)操作
}
```

### 配置热更新支持
```go
func (s *v1ImageService) invalidateCache() {
    // LRU库提供高效的清空操作
    s.imageCache.Purge()  // O(1)清空
    s.domainCache.Purge() // O(1)清空
}

// 动态调整缓存大小
func (s *v1ImageService) resizeCache(newSize int) error {
    newCache, err := lru.New(newSize)
    if err != nil {
        return err
    }

    // 迁移热点数据到新缓存
    for _, key := range s.imageCache.Keys() {
        if value, found := s.imageCache.Get(key); found {
            newCache.Add(key, value)
        }
    }

    s.imageCache = newCache
    s.maxCacheSize = newSize
    return nil
}
```

### 性能监控增强
```go
type CacheStats struct {
    ImageCacheHits     int64
    ImageCacheMisses   int64
    ImageCacheSize     int
    ImageEvictions     int64
    DomainCacheHits    int64
    DomainCacheMisses  int64
    DomainCacheSize    int
    DomainEvictions    int64
}

func (s *v1ImageService) GetCacheStats() CacheStats {
    imageStats := s.imageCache.Stats()
    domainStats := s.domainCache.Stats()

    return CacheStats{
        ImageCacheHits:   int64(imageStats.Hits),
        ImageCacheMisses: int64(imageStats.Misses),
        ImageCacheSize:   s.imageCache.Len(),
        ImageEvictions:   int64(imageStats.Evictions),
        DomainCacheHits:  int64(domainStats.Hits),
        DomainCacheMisses: int64(domainStats.Misses),
        DomainCacheSize:  s.domainCache.Len(),
        DomainEvictions:  int64(domainStats.Evictions),
    }
}
```

## 测试用例设计

### 1. LRU特定测试
```go
func TestLRUCache_EvictionOrder(t *testing.T) {
    service := setupTestServiceWithSmallLRUCache() // 缓存大小为5

    // 添加6个不同镜像，触发LRU淘汰
    for i := 0; i < 6; i++ {
        service.rewriteImage(fmt.Sprintf("image-%d:latest", i), "pull")
    }

    // 验证第一个镜像被淘汰
    _, found := service.getCachedResult("image-0:latest")
    assert.False(t, found)

    // 验证最新镜像仍在缓存中
    _, found = service.getCachedResult("image-5:latest")
    assert.True(t, found)
}

func TestLRUCache_AccessOrderUpdate(t *testing.T) {
    service := setupTestServiceWithSmallLRUCache()

    // 填充缓存
    for i := 0; i < 3; i++ {
        service.rewriteImage(fmt.Sprintf("image-%d:latest", i), "pull")
    }

    // 访问第一个镜像，更新其访问时间
    service.getCachedResult("image-0:latest")

    // 添加新镜像触发淘汰
    service.rewriteImage("image-3:latest", "pull")

    // image-0应该仍在缓存中（最近被访问）
    _, found := service.getCachedResult("image-0:latest")
    assert.True(t, found)

    // image-1应该被淘汰（最久未访问）
    _, found = service.getCachedResult("image-1:latest")
    assert.False(t, found)
}
```

### 2. 性能基准测试
```go
func BenchmarkLRUCache_vs_MapCache(b *testing.B) {
    lruService := setupTestServiceWithLRUCache()
    mapService := setupTestServiceWithMapCache()

    // 预填充缓存
    for i := 0; i < 1000; i++ {
        img := fmt.Sprintf("image-%d", i)
        lruService.cacheResult(img, img+"_new", true, nil)
        mapService.cacheResult(img, img+"_new", true, nil)
    }

    b.Run("LRU_Get", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            lruService.getCachedResult(fmt.Sprintf("image-%d", i%1000))
        }
    })

    b.Run("Map_Get", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            mapService.getCachedResult(fmt.Sprintf("image-%d", i%1000))
        }
    })
}

func BenchmarkConcurrentLRUAccess(b *testing.B) {
    service := setupTestServiceWithLRUCache()

    // 预填充
    for i := 0; i < 100; i++ {
        service.cacheResult(fmt.Sprintf("image-%d", i), fmt.Sprintf("new-image-%d", i), true, nil)
    }

    b.ResetTimer()
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            service.getCachedResult(fmt.Sprintf("image-%d", rand.Intn(100)))
        }
    })
}
```

### 3. 复杂度验证测试
```go
func TestCacheOperationComplexity(t *testing.T) {
    // 验证O(1)复杂度
    service := setupTestServiceWithLRUCache()

    // 测试不同规模缓存的性能
    sizes := []int{100, 1000, 10000}

    for _, size := range sizes {
        t.Run(fmt.Sprintf("Size_%d", size), func(t *testing.T) {
            // 预填充
            for i := 0; i < size; i++ {
                service.cacheResult(fmt.Sprintf("image-%d", i), fmt.Sprintf("new-%d", i), true, nil)
            }

            // 测量查找时间
            start := time.Now()
            for i := 0; i < 1000; i++ {
                service.getCachedResult(fmt.Sprintf("image-%d", rand.Intn(size)))
            }
            duration := time.Since(start)

            // 验证时间增长是常数级别
            t.Logf("Cache size: %d, 1000 lookups took: %v", size, duration)
            assert.Less(t, duration, 100*time.Millisecond) // 1000次查找应在100ms内完成
        })
    }
}
```

## 交付物清单

### 代码修改文件
1. **`pkg/server/cri_server_v1.go`** - 主要逻辑修改
   - 添加LRU缓存字段到v1ImageService结构
   - 重写rewriteImage函数，实现域名优先匹配
   - 添加O(1)复杂度的缓存管理方法

2. **`pkg/server/utils.go`** - 辅助函数
   - extractDomainFromImage函数
   - 域名匹配相关函数优化

3. **`pkg/server/auth_store.go`** - 配置管理增强
   - 添加观察者模式支持
   - 配置更新时的缓存失效回调

### 新增测试文件
4. **`pkg/server/cri_server_v1_test.go`** - 单元测试
   - 基础功能测试（域名匹配、fallback逻辑）
   - LRU特定测试（淘汰顺序、访问时间更新）
   - 并发安全测试
   - 边界条件测试

5. **`pkg/server/integration_test.go`** - 集成测试
   - 端到端镜像重写流程
   - 配置热更新测试
   - 多场景兼容性测试

6. **`pkg/server/benchmark_test.go`** - 性能测试
   - LRU vs Map缓存性能对比
   - O(1) vs O(n)复杂度验证
   - 高并发场景测试

### 依赖管理
7. **`go.mod`** - 添加LRU库依赖
   ```go
   require github.com/hashicorp/golang-lru v0.5.4
   ```

## 性能收益预期

### 时间复杂度优化
- **缓存查找**: O(n) → O(1)
- **缓存插入**: O(n) → O(1)
- **缓存淘汰**: O(n) → O(1)
- **整体性能提升**: 10-100倍（取决于缓存大小）

### 内存效率
- **LRU算法**: 更智能的内存使用策略
- **TTL机制**: 自动清理过期数据
- **容量限制**: 防止内存无限增长

### 系统稳定性
- **成熟库**: 经过生产环境验证
- **并发安全**: 内置线程安全机制
- **错误处理**: 完善的异常处理

## 实施约束

### 兼容性要求
- **API向后兼容**: 不改变现有接口签名
- **业务逻辑保持**: 不影响现有重写逻辑
- **配置兼容**: 支持现有配置格式

### 质量要求
- **测试覆盖率**: ≥ 90%
- **代码风格**: 遵循项目现有规范
- **错误处理**: 完善的错误和异常处理
- **文档更新**: 更新相关API文档

### 性能要求
- **内存增长**: < 50MB（1000条缓存）
- **响应时间**: 缓存命中 < 1ms
- **并发支持**: 支持1000+ QPS并发访问

## 部署注意事项

### 配置调优
1. **缓存大小**: 根据实际镜像数量调整maxCacheSize
2. **TTL设置**: 根据镜像更新频率调整过期时间
3. **监控指标**: 添加缓存命中率监控

### 运维监控
1. **内存使用**: 监控缓存占用的内存大小
2. **性能指标**: 监控缓存命中率和响应时间
3. **错误率**: 监控缓存操作失败率

### 回滚方案
1. **快速开关**: 支持运行时禁用缓存
2. **配置回退**: 支持快速回滚到原始配置
3. **数据备份**: 重要配置数据的备份机制

---

**此方案基于现有文档和性能优化需求设计，使用HashiCorp的LRU库实现O(1)时间复杂度的高效缓存机制，同时保证完整的测试覆盖和生产级可靠性。**