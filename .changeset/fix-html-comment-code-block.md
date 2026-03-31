---
"reskill": patch
---

fix: skip HTML comment obfuscation check inside code blocks

The large HTML comment detection (>200 chars) in the obfuscation rule now respects safe zones (fenced code blocks, indented code blocks, frontmatter, blockquotes). This fixes false positives when publishing SKILL.md files containing HTML code examples with normal comments.

---

fix: 跳过代码块内 HTML 注释的混淆检测

混淆规则中的大型 HTML 注释检测（>200 字符）现在会跳过安全区域（fenced 代码块、缩进代码块、frontmatter、blockquote）。修复了发布包含 HTML 代码示例的 SKILL.md 时，正常 HTML 注释被误判为「内容混淆」的问题。
