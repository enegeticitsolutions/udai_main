# Admin Main Backend

This backend serves the standalone admin panel at `admin-main/frontend`.

## Local development

1. `cd admin-main/backend`
2. `cp .env.example .env`
3. Set your MongoDB Atlas connection string
4. `npm install`
5. `npm run dev`

Default port: `5003`

## API

- `POST /api/admin/login`
- `GET /api/admin/bootstrap`
- `PATCH /api/admin/inquiries/:id`
- `PATCH /api/admin/volunteers/:id`
- `PATCH /api/admin/orders/:id`
- `PATCH /api/admin/therapists/:id`

## CORS

Allow the admin frontend origin in `CORS_ORIGIN`. You can provide multiple origins separated by commas.
