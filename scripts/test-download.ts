/**
 * 集成测试：从 Registry 下载 skill 并验证 integrity
 *
 * 用法:
 *   npx tsx scripts/test-download.ts
 *
 * 环境变量:
 *   REGISTRY - Registry URL (default: http://localhost:3000)
 *   SKILL_NAME - Skill name (default: @kanyun/planning-with-files)
 *   VERSION - Version or tag (default: latest)
 */

import { RegistryClient } from '../src/core/registry-client.js';

async function main() {
  const registry = process.env.REGISTRY || 'http://localhost:3000';
  const skillName = process.env.SKILL_NAME || '@kanyun/planning-with-files';
  const version = process.env.VERSION || 'latest';

  console.log('=== Download Integration Test ===');
  console.log(`Registry: ${registry}`);
  console.log(`Skill: ${skillName}`);
  console.log(`Version: ${version}`);
  console.log('');

  const client = new RegistryClient({ registry });

  try {
    // 1. 解析版本
    console.log('1. Resolving version...');
    const resolvedVersion = await client.resolveVersion(skillName, version);
    console.log(`   Resolved: ${version} -> ${resolvedVersion}`);

    // 2. 下载 tarball
    console.log('2. Downloading tarball...');
    const { tarball, integrity } = await client.downloadSkill(skillName, resolvedVersion);
    console.log(`   Size: ${tarball.length} bytes`);
    console.log(`   Integrity (from server): ${integrity}`);

    // 3. 验证 integrity
    console.log('3. Verifying integrity...');
    const calculatedIntegrity = RegistryClient.calculateIntegrity(tarball);
    console.log(`   Calculated: ${calculatedIntegrity}`);

    if (integrity) {
      const isValid = RegistryClient.verifyIntegrity(tarball, integrity);
      console.log(`   Match: ${isValid ? '✅ YES' : '❌ NO'}`);

      if (!isValid) {
        console.error('\n❌ Integrity mismatch!');
        process.exit(1);
      }
    } else {
      console.log('   ⚠️  Server did not return integrity header');
    }

    // 4. 验证是 gzip 格式
    console.log('4. Verifying format...');
    const isGzip = tarball[0] === 0x1f && tarball[1] === 0x8b;
    console.log(`   Is gzip: ${isGzip ? '✅ YES' : '❌ NO'}`);

    console.log('\n✅ Download test passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
