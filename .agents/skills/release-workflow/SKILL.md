---
name: release-workflow
description: Standardized workflow for bumping version, committing, and releasing the app.
---

# Release Workflow

When requested to "release", "publish", or "create a new release" after fixing bugs or adding features, ALWAYS follow this standardized workflow:

## Step 1: Pre-flight Verification
1. Ensure all code changes are complete and logically sound.
2. Run TypeScript compiler check (if applicable): \`npx tsc --noEmit 2>&1\`
3. Review \`git diff\` to ensure no unintended files are modified.

## Step 2: Version Bump
1. Check the current version:
   - Check \`package.json\` (\`version\`).
   - Check \`app.json\` (\`expo.version\` and \`expo.android.versionCode\`).
   - Run \`git tag --sort=-v:refname | head -5\` to see recent tags.
2. Determine the semantic bump (patch for bug fixes, minor for features, major for breaking changes).
3. **Important**: You must bump BOTH \`package.json\` and \`app.json\`:
   - Increment \`version\` in \`package.json\`.
   - Increment \`version\` in \`app.json\`.
   - Increment \`android.versionCode\` by 1 in \`app.json\`.

## Step 3: Git Commit & Tag
1. Stage your changes: \`git add -A\`
2. Create a comprehensive, semantic commit message summarizing the changes (e.g., \`fix: ...\` or \`feat: ...\`). Try to include bullet points if changes are substantial.
3. Commit the code: \`git commit -m "..."\`
4. Create an annotated git tag matching the newly bumped version: \`git tag -a vX.X.X -m "vX.X.X: <short summary>" \`
5. Push changes and tags to the remote: \`git push origin main --tags\`

## Step 4: GitHub Release
1. Generate the changelog between the previous version and the new version by running: `git log vPREV..vNEW --oneline`.
2. Draft a markdown release note summarizing the Bug Fixes, Features, and any debugging enhancements.
3. Automatically publish the release to GitHub bypassing interactive `gh` CLI traps by using the REST API:
   ```bash
   cat << 'EOF' > /tmp/release.json
   {
     "tag_name": "vX.X.X",
     "target_commitish": "main",
     "name": "vX.X.X - <Title>",
     "body": "<Markdown Changelog>",
     "draft": false,
     "prerelease": false
   }
   EOF
   TOKEN=$(git credential-osxkeychain get <<< $'protocol=https\nhost=github.com\n' 2>/dev/null | grep password | cut -d= -f2)
   curl -s -X POST -H "Accept: application/vnd.github+json" -H "Authorization: Bearer $TOKEN" -H "X-GitHub-Api-Version: 2022-11-28" -d @/tmp/release.json https://api.github.com/repos/<OWNER>/<REPO>/releases
   ```
## Step 5: Build & Attach to GitHub Release
Because EAS builds occur in the cloud, you must run the build command synchronously (`--wait`) and capture the output to automatically attach the APK to the GitHub Release. Execute the following script:

```bash
echo "🚀 Triggering EAS build and waiting for completion..."
# 1. Trigger build synchronously and output JSON
BUILD_JSON=$(eas build --platform android --profile preview --non-interactive --wait --json)

# 2. Extract APK URL
APK_URL=$(echo "$BUILD_JSON" | grep -o 'https://expo.dev/artifacts/eas/[^"]*\.apk' | head -1)
if [ -z "$APK_URL" ]; then echo "❌ Failed to extract APK URL"; exit 1; fi
echo "✅ Build completed! Downloading from $APK_URL..."

# 3. Download the APK
curl -L -o WakeUpDude-vX.X.X.apk "$APK_URL"

# 4. Get the Release ID from GitHub
TOKEN=$(git credential-osxkeychain get <<< $'protocol=https\nhost=github.com\n' 2>/dev/null | grep password | cut -d= -f2)
RELEASE_ID=$(curl -s -H "Authorization: Bearer $TOKEN" https://api.github.com/repos/<OWNER>/<REPO>/releases/tags/vX.X.X | grep '"id":' | head -1 | awk -F': ' '{print $2}' | tr -d ',')

# 5. Upload the APK as a Release Asset
echo "📦 Uploading APK to GitHub Release..."
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/vnd.android.package-archive" \
  --data-binary @WakeUpDude-vX.X.X.apk \
  "https://uploads.github.com/repos/<OWNER>/<REPO>/releases/$RELEASE_ID/assets?name=WakeUpDude-vX.X.X.apk"
echo "✅ Workflow complete!"

# 6. Cleanup
rm WakeUpDude-vX.X.X.apk /tmp/release.json
echo "🧹 Workspace cleaned."
```

## Error Handling
- If any TypeScript errors fail during pre-flight, DO NOT proceed with version bumping. Fix the errors first.
- If the git token/CLI authentication fails, quietly fallback to standard REST API via keychain token.
