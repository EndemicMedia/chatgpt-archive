# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD.

## Workflows

### `publish.yml` - Build and Publish Extension

This workflow builds the extension and publishes it to both the Chrome Web Store and Firefox Add-ons (AMO).

#### Triggers

- **Manual**: Run from GitHub Actions tab with custom options
- **Tag push**: Automatically triggers when pushing a tag like `v1.0.0`

#### Jobs

1. **build**: Runs tests and builds the extension for both Chrome and Firefox
2. **publish-chrome**: Uploads to Chrome Web Store (requires secrets)
3. **publish-firefox**: Signs and publishes to Firefox AMO (requires secrets)
4. **create-release**: Creates a GitHub Release with the built extensions

## Required Secrets

You need to add the following secrets to your GitHub repository:

### Chrome Web Store Secrets

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the **Chrome Web Store API**
4. Go to **APIs & Services > Credentials**
5. Create **OAuth 2.0 Client ID** (Desktop application type)
6. Set publishing status to **"In production"** in OAuth consent screen
7. Use [OAuth 2.0 Playground](https://developers.google.com/oauthplayground) to get a refresh token:
   - Select Chrome Web Store API scope: `https://www.googleapis.com/auth/chromewebstore`
   - Exchange authorization code for tokens
   - Copy the **Refresh Token**

Add these secrets to your repo (Settings > Secrets and variables > Actions):

| Secret | Value |
|--------|-------|
| `CHROME_EXTENSION_ID` | Your Chrome extension ID (from Web Store Developer Dashboard) |
| `CHROME_CLIENT_ID` | OAuth 2.0 Client ID |
| `CHROME_CLIENT_SECRET` | OAuth 2.0 Client Secret |
| `CHROME_REFRESH_TOKEN` | Refresh Token from OAuth Playground |

### Firefox Add-ons Secrets

1. Go to [Firefox Add-ons Developer Hub](https://addons.mozilla.org/en-US/developers/)
2. Log in with your Firefox account
3. Go to **API Credentials**
4. Generate new credentials if needed
5. Copy the **JWT issuer** and **JWT secret**

Add these secrets to your repo:

| Secret | Value |
|--------|-------|
| `FIREFOX_API_KEY` | JWT issuer (looks like `user:12345:67`) |
| `FIREFOX_API_SECRET` | JWT secret |

## Manual Publishing

To manually trigger a publish:

1. Go to **Actions** tab in your GitHub repo
2. Select **"Build and Publish Extension"**
3. Click **Run workflow**
4. Enter the version number
5. Select which stores to publish to
6. Click **Run workflow**

## Tag-based Publishing

To publish by pushing a tag:

```bash
git tag v1.0.1
git push origin v1.0.1
```

This will automatically trigger the workflow.

## Notes

- Chrome Web Store publishing is set to `publish: false` by default, which means it uploads but doesn't publish immediately (goes to "Pending review" first)
- Firefox AMO submissions go through Mozilla's review process
- Both stores typically take 1-2 business days for review
