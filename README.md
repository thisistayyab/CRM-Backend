# Taylance CRM API (Backend)

REST API for Taylance CRM. **Owned and maintained by [Taylance Tech](https://taylancetech.com).**

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development with auto-reload (nodemon) |
| `npm start` | Production server (Node) |

## Setup

```bash
cd Backend
npm install
cp .env.example .env
# Fill in MongoDB, JWT, SMTP, Redis, Cloudinary
npm run dev
```

## Environment

See `.env.example` for all variables. Key production settings:

- `NODE_ENV=production`
- `CORS_ORIGIN` — your CRM subdomain(s), comma-separated
- `FRONTEND_URL` — used in verification/reset email links
- `SUPPORT_EMAIL` — shown in transactional emails

## Stack

Node.js · Express 5 · MongoDB · Redis · Cloudinary · Argon2id (password hashing)

## Password hashing

New passwords are hashed with **Argon2id**. Existing accounts created with the old bcrypt hashes must **reset their password** once after this upgrade.
