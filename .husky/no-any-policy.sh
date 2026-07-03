#!/usr/bin/env bash

# [no-any-policy] Prevent committing any type
echo "[Husky] Checking for explicit 'any' type in staged files (no-any-policy)..."

any_found=0

while IFS= read -r -d '' file; do
  if [[ ! "$file" =~ \.tsx?$ ]]; then
    continue
  fi

  if [[ "$file" == *"next-env.d.ts"* ]]; then
    continue
  fi

  # Check the staged content, not the working tree file, to avoid unstaged changes bypass
  # Catch : any, <any>, as any, and = any (for type aliases)
  if git show ":$file" | grep -n -E '(:[[:space:]]*any\b|<any>|\bas[[:space:]]+any\b|=[[:space:]]*any\b)'; then
    echo "❌ Error: Found explicit 'any' type in $file. Please use a proper type or 'unknown'."
    any_found=1
  fi
done < <(git diff --cached --name-only --diff-filter=ACM -z)

if [ $any_found -eq 1 ]; then
  echo "❌ [no-any-policy] Commit rejected due to the usage of 'any' type."
  exit 1
fi

echo "✅ [no-any-policy] No 'any' type found in staged files."
exit 0
