#!/usr/bin/env sh

# [no-any-policy] Prevent committing any type
echo "[Husky] Checking for explicit 'any' type in staged files (no-any-policy)..."

# Get staged TypeScript/TSX files
staged_files=$(git diff --cached --name-only --diff-filter=ACM | grep '\.tsx\?$')

if [ -z "$staged_files" ]; then
  exit 0
fi

any_found=0

for file in $staged_files; do
  # Exclude next-env.d.ts or other auto-generated types if necessary
  if echo "$file" | grep -q "next-env.d.ts"; then
    continue
  fi

  # Check if "any" is used as a type (e.g. ": any", "<any>", "as any")
  if grep -n -E '(:[[:space:]]*any\b|<any>|\bas[[:space:]]+any\b)' "$file"; then
    echo "❌ Error: Found explicit 'any' type in $file. Please use a proper type or 'unknown'."
    any_found=1
  fi
done

if [ $any_found -eq 1 ]; then
  echo "❌ [no-any-policy] Commit rejected due to the usage of 'any' type."
  exit 1
fi

echo "✅ [no-any-policy] No 'any' type found in staged files."
exit 0
