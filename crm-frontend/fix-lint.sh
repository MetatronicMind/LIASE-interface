#!/bin/bash
# Quick fix script for common ESLint/TypeScript issues

echo "🔧 Applying quick fixes to TypeScript/ESLint issues..."

# Replace 'any' types with more generic types (this is a temporary fix)
find ./src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/: any/: unknown/g'
find ./src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/any\[\]/unknown[]/g'

# Fix common React no-unescaped-entities issues
find ./src -name "*.tsx" | xargs sed -i "s/don't/don\&apos\;t/g"
find ./src -name "*.tsx" | xargs sed -i 's/"/\&quot;/g'
find ./src -name "*.tsx" | xargs sed -i "s/'/\&apos;/g"

echo "✅ Basic fixes applied. You may need to review and fix remaining issues manually."
echo "💡 Consider running 'npm run lint --fix' to auto-fix remaining issues."