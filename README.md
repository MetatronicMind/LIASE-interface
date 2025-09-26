# LIASE App – PubMed Ingestion, Cosmos DB, Role-based access

This repo contains:

- Backend: Node.js/Express API with Azure Cosmos DB, JWT auth, roles/permissions, and PubMed ingestion.
- Frontend: Next.js app (App Router) consuming the API.

## Prerequisites

- Node.js >= 18
- Azure Cosmos DB (SQL API) or Cosmos Emulator
- Optional: Azure Managed Identity in production

## Backend setup

1. Copy `backend/.env.example` to `backend/.env.local` and fill:

   - COSMOS_DB_ENDPOINT
   - COSMOS_DB_KEY (dev/emulator) or use Managed Identity in prod
   - COSMOS_DB_DATABASE_ID (default: liase-saas)
   - JWT_SECRET
   - FRONTEND_URL (e.g., http://localhost:3000)
   - PUBMED_EMAIL (optional, recommended by NCBI)
   - PUBMED_TOOL (optional identifier)

2. Install deps and seed:

   - In VS Code terminal at repo root:
     - cd backend
     - npm install
     - npm run setup-local-db (optional)
     - npm run seed-data (optional)

3. Run API:
   - npm run dev
   - Health: GET http://localhost:8000/api/health

## Frontend setup

1. In `frontend`, install and run:
   - npm install
   - npm run dev
   - App: http://localhost:3000

## Auth and roles

- JWT via `/api/auth/login` with email/username + password
- Users belong to organizations. Role gating is via middleware `authorization.js` and per-resource permissions off the User model.

## Data model (Cosmos containers)

- organizations (partitionKey: /id)
- users (partitionKey: /organizationId)
- drugs (partitionKey: /organizationId)
- studies (partitionKey: /organizationId)
- audit-logs (partitionKey: /organizationId, TTL 30 days)

## Key endpoints

- Auth:
  - POST /api/auth/login
  - POST /api/auth/register
  - POST /api/auth/refresh
- Drugs (auth required): CRUD under `/api/drugs`
- Studies (auth required): CRUD under `/api/studies`
- PubMed ingestion:
  - POST /api/studies/ingest/pubmed
    - body: { drugId?: string, query?: string, maxResults?: number (<=200), adverseEvent?: string }
    - If `drugId` provided, default query is "<drug.name> adverse events". Falls back to `query` if present.
    - Creates new `Study` items per PMID if not present for the organization.
- Admin:
  - POST /api/admin/create-organization (bootstrap)
  - GET /api/admin/stats/system
  - POST /api/admin/cleanup/audit-logs
  - GET /api/admin/health/database

## PubMed ingestion design

- `src/services/pubmedService.js` wraps NCBI E-utilities (esearch + efetch) and maps XML to a minimal study payload.
- `POST /api/studies/ingest/pubmed` searches, fetches details, validates, and inserts unique studies.

## Development notes

- For local emulator, SSL verify is disabled in dev.
- Rate limiting and Helmet are enabled.
- Audit logs are stored per request and for explicit actions.

## Testing quick checks

- Backend: npm test
- Health: curl http://localhost:8000/api/health

## Troubleshooting

- 401: ensure Authorization: Bearer <token> from /api/auth/login
- Cosmos 404s: verify database/containers were created on server start.
- PubMed 429: reduce `maxResults` and avoid frequent calls; set PUBMED_EMAIL.

## License

MIT
