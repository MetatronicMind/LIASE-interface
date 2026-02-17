const { DefaultAzureCredential } = require('@azure/identity');
let SecretClient;
try {
  // Lazy require so build doesn't fail if package missing (will be added)
  SecretClient = require('@azure/keyvault-secrets').SecretClient;
} catch (_) {
  // Will throw later if Key Vault actually requested
}

/**
 * Load a secret by first checking direct environment variable, then (optionally) Azure Key Vault.
 * Environment variable precedence order:
 *   1. Explicit override (e.g. COSMOS_DB_KEY)
 *   2. If secret name env (e.g. COSMOS_DB_KEY_SECRET_NAME) + AZURE_KEY_VAULT_URL present -> fetch from Key Vault
 *   3. Fallback value provided to function (if any)
 */
async function loadSecret({ directEnv, secretNameEnv, fallback, required = false, maskLog = true }) {
  const directValue = process.env[directEnv];
  if (directValue) {
    return directValue;
  }
  const secretName = process.env[secretNameEnv];
  const vaultUrl = process.env.AZURE_KEY_VAULT_URL;
  if (secretName && vaultUrl) {
    if (!SecretClient) {
      throw new Error('Key Vault secret client not available. Install @azure/keyvault-secrets.');
    }
    const credential = new DefaultAzureCredential();
    const client = new SecretClient(vaultUrl, credential);
    try {
      const resp = await client.getSecret(secretName);
      return resp.value;
    } catch (err) {
      if (required) {
        err.message = `Failed to load required secret ${secretName} from Key Vault: ${err.message}`;
        throw err;
      }
    }
  }
  if (fallback) {
    return fallback;
  }
  if (required) {
    throw new Error(`Missing required secret: ${directEnv} or (${secretNameEnv} + AZURE_KEY_VAULT_URL)`);
  }
  return undefined;
}

module.exports = { loadSecret };