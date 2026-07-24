# Admin Main Frontend

Standalone React admin panel for the UDAI platform.

## Local development

1. `cd admin-main/backend`
2. `cp .env.example .env`
3. Set your MongoDB Atlas URI and `CORS_ORIGIN`
4. `npm install`
5. `npm run dev`

In a second terminal:

1. `cd admin-main/frontend`
2. `cp .env.example .env`
3. Set `VITE_ADMIN_API_BASE` if you want to bypass the dev proxy
4. `npm install`
5. `npm run dev`

## Production deployment

Set the admin API base URL before building:

```env
VITE_ADMIN_API_BASE=https://udaiapi.datamoshtechnologies.com/api/admin
VITE_ADMIN_URL=https://admin.udairehab.org
VITE_SITE_URL=https://udairehab.org
```

Then build:

```bash
npm run build
```

Deploy the generated `dist/` folder to your static host.

## Backend requirements

The backend must allow the admin domain in `CORS_ORIGIN`, for example:

```env
CORS_ORIGIN=https://admin.udairehab.org,https://udairehab.org
FRONTEND_ORIGIN=https://udairehab.org
ADMIN_ORIGIN=https://admin.udairehab.org
```

For local development, the admin frontend proxy points to `http://localhost:5003`.
