## Description

Backend API untuk sistem informasi akademik SIAKNG-Lite, dibangun menggunakan NestJS dengan arsitektur modular dan sistem keamanan berbasis Role-Based Access Control (RBAC).

## Tech Stack

- Framework: NestJS (TypeScript)

- Database: PostgreSQL (Neon.tech)

- ORM: Drizzle ORM

- Authentication: Passport.js & JWT

## Project setup

1. Instalasi Dependensi
```bash
$ npm install
```

2. Konfigurasi Environment (.env)
```bash
DATABASE_URL=postgres://user:password@neondb_url/dbname
JWT_SECRET=your_secret_key_here
PORT=3000
```


3. Migrasi Database
```bash
npx drizzle-kit push
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