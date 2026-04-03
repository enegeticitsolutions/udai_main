# Admin Main

Clean production-ready standalone admin workspace.

## Structure

- `frontend/` - React admin UI
- `backend/` - Admin API server

## Local development

### Backend

```bash
cd admin-main/backend
cp .env.example .env
npm install
npm run dev
```

### Frontend

```bash
cd admin-main/frontend
cp .env.example .env
npm install
npm run dev
```

## Default ports

- Frontend: `http://localhost:5191`
- Backend: `http://localhost:5003`

## Deployment

Use the `.env.example` files inside each folder as your deployment templates.
