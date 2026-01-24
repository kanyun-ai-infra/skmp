---
"reskill": minor
---

Add HTTP/OSS URL support for skill installation

**Changes:**
- Added `HttpResolver` for parsing HTTP/HTTPS/OSS/S3 URLs
- Added `downloadFile`, `extractArchive`, `downloadAndExtract` utilities
- Updated `CacheManager` with `cacheFromHttp()` method
- Updated `SkillManager` to auto-detect and handle HTTP sources
- Support for archive formats: tar.gz, tgz, zip, tar

**Supported URL formats:**
- `https://example.com/skill-v1.0.0.tar.gz`
- `https://bucket.oss-cn-hangzhou.aliyuncs.com/skill.tar.gz`
- `oss://bucket/path/skill.tar.gz` (Aliyun OSS shorthand)
- `s3://bucket/path/skill.tar.gz` (AWS S3 shorthand)

---

新增 HTTP/OSS URL 安装支持

**变更内容:**
- 新增 `HttpResolver` 用于解析 HTTP/HTTPS/OSS/S3 URL
- 新增 `downloadFile`、`extractArchive`、`downloadAndExtract` 工具函数
- 更新 `CacheManager`，添加 `cacheFromHttp()` 方法
- 更新 `SkillManager`，自动检测并处理 HTTP 源
- 支持归档格式：tar.gz、tgz、zip、tar

**支持的 URL 格式:**
- `https://example.com/skill-v1.0.0.tar.gz`
- `https://bucket.oss-cn-hangzhou.aliyuncs.com/skill.tar.gz`
- `oss://bucket/path/skill.tar.gz`（阿里云 OSS 简写）
- `s3://bucket/path/skill.tar.gz`（AWS S3 简写）
