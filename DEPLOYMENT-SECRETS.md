# Deployment Secrets & Configuration

This backend supports flexible secret sourcing so you do NOT need to bake credentials directly into the code or deployment package.

## Supported Sources (Precedence)

1. Direct environment variables (e.g. `COSMOS_DB_KEY`)
2. Azure Key Vault secret names + `AZURE_KEY_VAULT_URL` (e.g. `COSMOS_DB_KEY_SECRET_NAME`)
3. Managed Identity (production only, for auth to Cosmos when RBAC enabled)

## Cosmos DB Configuration

Minimal required for dev:

```
COSMOS_DB_ENDPOINT=https://<account>.documents.azure.com:443/
COSMOS_DB_KEY=<primary-or-secondary-key>
```

Recommended production pattern (avoid storing raw key in App Service settings):

```
AZURE_KEY_VAULT_URL=https://your-keyvault.vault.azure.net/
COSMOS_DB_ENDPOINT_SECRET_NAME=cosmos-endpoint
COSMOS_DB_KEY_SECRET_NAME=cosmos-key
COSMOS_DB_DATABASE_ID=liase-saas
```

Populate those secrets in Key Vault:

```
az keyvault secret set --vault-name your-keyvault -n cosmos-endpoint --value "https://<account>.documents.azure.com:443/"
az keyvault secret set --vault-name your-keyvault -n cosmos-key --value "<primary-key>"
```

Assign the Web App's system-assigned managed identity access (Key Vault Access Policy or RBAC Secret Get permission).

## Azure App Service Settings Example

Set these in the App Service Configuration blade (no code changes required):

```
AZURE_KEY_VAULT_URL=https://your-keyvault.vault.azure.net/
COSMOS_DB_ENDPOINT_SECRET_NAME=cosmos-endpoint
COSMOS_DB_KEY_SECRET_NAME=cosmos-key
COSMOS_DB_DATABASE_ID=liase-saas
JWT_SECRET=<jwt-secret>
```

If you've enabled Azure AD RBAC access for Cosmos and granted the Web App identity the required roles (e.g. `Cosmos DB Account Reader Role` + data plane roles), you can omit `COSMOS_DB_KEY` entirely in production and rely on Managed Identity.

## GitHub Actions (Optional)

Store secrets in GitHub repository settings:

```
COSMOS_DB_ENDPOINT
COSMOS_DB_KEY
JWT_SECRET
```

Then in workflow YAML:

```
- name: Set env
  run: |
    echo "COSMOS_DB_ENDPOINT=${{ secrets.COSMOS_DB_ENDPOINT }}" >> $GITHUB_ENV
    echo "COSMOS_DB_KEY=${{ secrets.COSMOS_DB_KEY }}" >> $GITHUB_ENV
    echo "JWT_SECRET=${{ secrets.JWT_SECRET }}" >> $GITHUB_ENV
```

Or for Key Vault integration use the `azure/login` + `azure/keyvault` actions to download secrets and export them as env vars before starting the app.

## Health & Failure Modes

- If secrets not resolvable, requests (except `/api/health` & `/api/auth/login`) return `503 COSMOS_UNAVAILABLE`.
- Detailed last init error available internally via `cosmosService.getStatus()`.

## Rotation Strategy

1. Add new secret value to Key Vault using a new version.
2. (Optional) Update App Service setting if using direct env var.
3. Restart Web App (or let slot swap reload environment).
4. Once confirmed, disable previous key in Azure Cosmos (if rotating key).

## Checklist Before Production

- [ ] Managed Identity enabled on Web App / Function App
- [ ] Key Vault access policy or RBAC set for secret get
- [ ] Cosmos endpoint secret created
- [ ] Cosmos key secret created (unless using RBAC only)
- [ ] JWT secret present
- [ ] Health endpoint returns 200 and app routes return data

---

For enhancements (future): integrate Azure App Configuration, add deep health probe, implement proactive re-init backoff.

## GitHub Actions Workflow Secrets (backend-ci-deploy.yml)

If using the provided workflow `.github/workflows/backend-ci-deploy.yml`, add these repository secrets:

| Secret Name | Purpose |
| ----------- | ------- |
| `AZURE_CREDENTIALS` | JSON output of `az ad sp create-for-rbac` for azure/login (ClientId, ClientSecret, TenantId, SubscriptionId) |
| `AZURE_WEBAPP_NAME` | Target App Service name |
| `AZURE_RESOURCE_GROUP` | Resource group containing the App Service |
| `COSMOS_DB_ENDPOINT` | Cosmos endpoint URL (if not using Key Vault indirection) |
| `COSMOS_DB_KEY` | Primary/secondary key (omit if using managed identity with RBAC) |
| `JWT_SECRET` | Application JWT signing secret |

Optional (if using Key Vault instead of raw key):

| Secret Name | Purpose |
| ----------- | ------- |
| `KEY_VAULT_NAME` | Used if you extend workflow to fetch secrets dynamically |

> The workflow sets App Settings after deployment; if you switch to Key Vault references directly in App Service (e.g. `@Microsoft.KeyVault(SecretUri=...)`), remove the explicit `az webapp config appsettings set` step for those entries.
