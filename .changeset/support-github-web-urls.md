---
"reskill": minor
---

Support GitHub/GitLab web URLs with branch and subpath

**New Feature:**
- Now supports installing skills directly from GitHub/GitLab web URLs
- Automatically extracts branch and subpath information from URLs like:
  - `https://github.com/user/repo/tree/main/skills/skill-name`
  - `https://github.com/user/repo/blob/dev/path/to/skill`
- Branch is automatically set as the version (e.g., `branch:main`)

**Technical Changes:**
- Enhanced `parseGitUrl()` in `src/utils/git.ts` to detect and parse web URLs
- Updated `parseGitUrlRef()` in `src/core/git-resolver.ts` to handle `/tree/`, `/blob/`, and `/raw/` patterns
- Removed redundant web URL parsing code for cleaner implementation
- Added comprehensive test cases for web URL parsing

**Tested with:**
- `https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices`
- `https://github.com/anthropics/skills/tree/main/skills/pdf`
- `https://github.com/OthmanAdi/planning-with-files/tree/master/skills/planning-with-files`

---

支持 GitHub/GitLab 网页 URL（包含分支和子路径）

**新功能：**
- 现在支持直接从 GitHub/GitLab 网页 URL 安装 skills
- 自动从 URL 中提取分支和子路径信息，例如：
  - `https://github.com/user/repo/tree/main/skills/skill-name`
  - `https://github.com/user/repo/blob/dev/path/to/skill`
- 分支会自动设置为版本（例如 `branch:main`）

**技术变更：**
- 增强 `src/utils/git.ts` 中的 `parseGitUrl()` 以检测和解析网页 URL
- 更新 `src/core/git-resolver.ts` 中的 `parseGitUrlRef()` 以处理 `/tree/`、`/blob/` 和 `/raw/` 模式
- 删除冗余的网页 URL 解析代码，实现更简洁
- 添加了全面的网页 URL 解析测试用例

**测试验证：**
- `https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices`
- `https://github.com/anthropics/skills/tree/main/skills/pdf`
- `https://github.com/OthmanAdi/planning-with-files/tree/master/skills/planning-with-files`
