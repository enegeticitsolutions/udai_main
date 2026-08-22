# MSG91 Bridge Service

Lightweight Node.js/Express microservice that receives outbound HTTP POST calls from a chatbot builder API Node, validates the payload, and stores it in MongoDB through Mongoose.

## File Structure

```text
msg91-bridge-service/
  .env.example
  package.json
  README.md
  scripts/
    smoke-test.js
  src/
    app.js
    server.js
    config/env.js
    db/mongoose.js
    middleware/apiKeyAuth.js
    middleware/errorHandler.js
    models/ChatbotSubmission.js
    repositories/
      ChatbotSubmissionRepository.js
      MemoryChatbotSubmissionRepository.js
      MongoChatbotSubmissionRepository.js
      index.js
    routes/msg91Webhook.js
    services/payloadMapper.js
```

## Setup

```bash
cd msg91-bridge-service
npm install
cp .env.example .env
```

Edit `.env`:

```env
PORT=8080
WEBHOOK_API_KEY=replace_with_a_long_random_secret
DB_DRIVER=mongodb
MONGODB_URI=mongodb://127.0.0.1:27017/msg91_bridge
```

Run locally:

```bash
npm run dev
```

Production start:

```bash
npm start
```

Deploy it like any Express service: set the environment variables in your hosting provider, ensure MongoDB is reachable from the server, and expose the service over HTTPS.

## Endpoint

```text
POST /api/v1/msg91-webhook
```

Required header:

```text
x-api-key: your WEBHOOK_API_KEY value
```

## Chatbot API Node Request Body

Copy this JSON into your chatbot builder API Node request body and map the variables to your platform variable names:

```json
{
  "phone": "{{user_phone}}",
  "message": "{{user_message}}",
  "transactionId": "{{msg91_transaction_id}}",
  "name": "{{user_name}}",
  "age": "{{user_age}}",
  "parentName": "{{parent_name}}",
  "problem": "{{problem}}",
  "source": "msg91-api-node"
}
```

Set the API Node URL to:

```text
https://your-domain.com/api/v1/msg91-webhook
```

For local testing with a tunnel such as ngrok:

```text
https://your-ngrok-url.ngrok-free.app/api/v1/msg91-webhook
```

## cURL Test

```bash
curl -X POST http://localhost:8080/api/v1/msg91-webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: replace_with_a_long_random_secret" \
  -d '{
    "phone": "+919999999999",
    "message": "Child needs speech therapy support",
    "transactionId": "MSG91-TXN-10001",
    "name": "Aarav",
    "age": 7,
    "parentName": "Priya Sharma",
    "problem": "Speech delay",
    "source": "msg91-api-node"
  }'
```

Success response:

```json
{
  "success": true,
  "message": "MSG91 chatbot data recorded",
  "data": {
    "id": "mongodb_document_id",
    "transactionId": "MSG91-TXN-10001",
    "receivedAt": "2026-06-16T00:00:00.000Z"
  }
}
```

## Database Abstraction

The route depends on a repository interface, not directly on Mongoose. The default adapter is:

```text
MongoChatbotSubmissionRepository
```

To swap MongoDB for PostgreSQL or MySQL later:

1. Create a new repository class that implements `create(submission)`.
2. Add a new `DB_DRIVER` branch in `src/repositories/index.js`.
3. Keep the route unchanged.

## Validation Rules

The service validates:

- `phone` or `user_phone`: required after mapping, 8 to 32 characters.
- `message`, `responseBody`, or `user_message`: required after mapping, max 4000 characters.
- `transactionId`, `msg91TransactionId`, or `transaction_id`: required after mapping, 3 to 160 characters.
- `age`: optional integer from 0 to 120.

## Smoke Test

This verifies the Express app initializes and accepts a valid webhook payload using the in-memory repository:

```bash
npm run smoke:test
```
