/**
 * Commercial Readiness Check Script
 * 检查SDK的商业化就绪程度
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Mycelium SDK Commercial Readiness Check\n');

const checks = {
  codeQuality: 0,
  testing: 0,
  documentation: 0,
  cicd: 0,
  packaging: 0,
  security: 0
};

let totalScore = 0;
let maxScore = 0;

function checkItem(category, points, condition, description) {
  maxScore += points;
  if (condition) {
    checks[category] += points;
    totalScore += points;
    console.log(`✅ ${description} (+${points})`);
  } else {
    console.log(`❌ ${description} (0/${points})`);
  }
}

// 1. Code Quality Checks
console.log('📝 Code Quality:');
checkItem('codeQuality', 10, fs.existsSync('./src/MyceliumSDK.js'), 'Main SDK file exists');
checkItem('codeQuality', 10, fs.existsSync('./src/errors.js'), 'Custom error classes');
checkItem('codeQuality', 10, fs.existsSync('./src/utils.js'), 'Utility functions');
checkItem('codeQuality', 10, fs.existsSync('./src/constants.js'), 'Constants definition');
checkItem('codeQuality', 5, fs.existsSync('./src/types.d.ts'), 'TypeScript definitions');

// 2. Testing Infrastructure
console.log('\n🧪 Testing Infrastructure:');
checkItem('testing', 15, fs.existsSync('./test') || fs.existsSync('./__tests__'), 'Test directory exists');
checkItem('testing', 10, fs.existsSync('./jest.config.js') || fs.existsSync('./jest.config.json'), 'Jest configuration');

try {
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  checkItem('testing', 10, packageJson.scripts?.test, 'Test script in package.json');
  checkItem('testing', 5, packageJson.devDependencies?.jest, 'Jest dependency');
} catch (error) {
  checkItem('testing', 25, false, 'Package.json readable and has test config');
}

// 3. Documentation
console.log('\n📚 Documentation:');
checkItem('documentation', 10, fs.existsSync('./DEVELOPER_GUIDE.md'), 'Developer guide exists');
checkItem('documentation', 10, fs.existsSync('./examples'), 'Examples directory');
checkItem('documentation', 5, fs.existsSync('./README.md'), 'README exists');

try {
  const devGuide = fs.readFileSync('./DEVELOPER_GUIDE.md', 'utf8');
  checkItem('documentation', 10, devGuide.includes('API Reference'), 'API Reference in dev guide');
  checkItem('documentation', 5, devGuide.length > 10000, 'Comprehensive documentation (>10k chars)');
} catch (error) {
  checkItem('documentation', 15, false, 'Developer guide readable and comprehensive');
}

// 4. CI/CD
console.log('\n🔄 CI/CD:');
checkItem('cicd', 15, fs.existsSync('./.github/workflows'), 'GitHub Actions workflows');
checkItem('cicd', 10, fs.existsSync('./Dockerfile'), 'Docker configuration');
checkItem('cicd', 5, fs.existsSync('./.gitignore'), 'Git ignore file');

// 5. Packaging
console.log('\n📦 Packaging:');
try {
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  checkItem('packaging', 10, packageJson.main && packageJson.module, 'Multiple build targets');
  checkItem('packaging', 10, packageJson.types, 'TypeScript types field');
  checkItem('packaging', 5, packageJson.files, 'Files field specified');
  checkItem('packaging', 5, packageJson.repository, 'Repository field');
  checkItem('packaging', 5, packageJson.keywords?.length > 0, 'Keywords specified');
  checkItem('packaging', 5, packageJson.license, 'License specified');
} catch (error) {
  checkItem('packaging', 40, false, 'Package.json properly configured');
}

// 6. Security
console.log('\n🔒 Security:');
checkItem('security', 10, fs.existsSync('./SECURITY.md'), 'Security policy');
checkItem('security', 5, fs.existsSync('./.nvmrc'), 'Node version specified');

try {
  const sdkContent = fs.readFileSync('./src/MyceliumSDK.js', 'utf8');
  checkItem('security', 10, sdkContent.includes('validateAddress'), 'Input validation');
  checkItem('security', 10, sdkContent.includes('_ensureNotDestroyed'), 'State validation');
  checkItem('security', 5, sdkContent.includes('process.env.NODE_ENV'), 'Environment checks');
} catch (error) {
  checkItem('security', 25, false, 'Security measures in code');
}

// Calculate scores
console.log('\n📊 Commercial Readiness Score:');
console.log('================================');

Object.entries(checks).forEach(([category, score]) => {
  const categoryMax = {
    codeQuality: 45,
    testing: 40,
    documentation: 40,
    cicd: 30,
    packaging: 40,
    security: 40
  }[category];
  
  const percentage = Math.round((score / categoryMax) * 100);
  const status = percentage >= 80 ? '🟢' : percentage >= 60 ? '🟡' : '🔴';
  
  console.log(`${status} ${category.padEnd(15)}: ${score}/${categoryMax} (${percentage}%)`);
});

const overallPercentage = Math.round((totalScore / maxScore) * 100);
const overallStatus = overallPercentage >= 80 ? '🟢 READY' : 
                     overallPercentage >= 60 ? '🟡 NEEDS WORK' : '🔴 NOT READY';

console.log('================================');
console.log(`Overall Score: ${totalScore}/${maxScore} (${overallPercentage}%)`);
console.log(`Status: ${overallStatus}`);

// Recommendations
console.log('\n💡 Priority Recommendations:');

if (checks.testing < 30) {
  console.log('🔴 HIGH: Add comprehensive test suite (Jest + test files)');
}
if (checks.cicd < 20) {
  console.log('🔴 HIGH: Set up CI/CD pipeline (GitHub Actions)');
}
if (checks.security < 30) {
  console.log('🟡 MED: Add security documentation and policies');
}
if (checks.packaging < 30) {
  console.log('🟡 MED: Improve package.json configuration');
}

console.log('\n🎯 Next Steps:');
if (overallPercentage >= 80) {
  console.log('✅ SDK is ready for commercial release!');
  console.log('   Consider: Performance testing, security audit, beta testing');
} else if (overallPercentage >= 60) {
  console.log('⚠️  SDK needs improvements before commercial release');
  console.log('   Focus on: Testing infrastructure and CI/CD setup');
} else {
  console.log('❌ SDK requires significant work before commercial release');
  console.log('   Priority: Testing, CI/CD, and security measures');
}

console.log('\n📋 Commercial Readiness Checklist:');
console.log('- [ ] Test coverage >90%');
console.log('- [ ] CI/CD pipeline active');
console.log('- [ ] Security audit completed');
console.log('- [ ] Performance benchmarks established');
console.log('- [ ] Documentation review completed');
console.log('- [ ] Beta testing with real users');
console.log('- [ ] npm package published');
console.log('- [ ] Monitoring and analytics setup');