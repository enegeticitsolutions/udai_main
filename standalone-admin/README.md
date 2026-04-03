# UDAI Standalone Admin

Separate React admin panel for the UDAI platform.

## Local development

1. `cd standalone-admin`
2. `cp .env.example .env`
3. Set `VITE_ADMIN_API_BASE` if your backend is not running on the same origin.
4. `npm install`
5. `npm run dev`

## Production deployment

Set the admin API base URL before building:

```env
VITE_ADMIN_API_BASE=https://api.example.com/api/admin
```

Then build:

```bash
npm run build
```

Deploy the generated `dist/` folder to your static host.

## Backend requirements

The backend must allow the admin domain in `CORS_ORIGIN`, for example:

```env
CORS_ORIGIN=https://admin.example.com,https://www.example.com
```
