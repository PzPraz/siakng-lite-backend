## Description

Backend API untuk sistem informasi akademik SIAKNG-Lite, dibangun menggunakan NestJS dengan arsitektur modular dan sistem keamanan berbasis Role-Based Access Control (RBAC).

## Tech Stack

- Framework: NestJS (TypeScript)

- Database: PostgreSQL (Neon.tech)

- ORM: Drizzle ORM

- Authentication: Passport.js & JWT

## Run Locally

1. Clone repository
```bash
git clone <repo-url>
cd siakng-lite-backend
```

2. Install dependency
```bash
npm install
```

3. Create file `.env` di root project
```bash
DATABASE_URL=postgres://user:password@neondb_url/dbname
JWT_SECRET=your_secret_key_here
PORT=3000
```

4. Jalankan migrasi database
```bash
npx drizzle-kit push
```

5. Jalankan backend
```bash
npm run start:dev
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Deployment

Production API: https://siakng-lite-backend-production.up.railway.app/