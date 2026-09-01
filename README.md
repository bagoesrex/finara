This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Quality checks

```bash
npm test
npm run test:integration
npm run lint
npm run typecheck
npm run build
```

The integration command requires a migrated local PostgreSQL database from
`.env` and runs the deterministic schema, authorization, finance-service, and
rate-limit checks:

```bash
npm run db:migrate:deploy
npm run test:integration
```

The real-browser gate requires the ignored `.env` to point at PostgreSQL on
`localhost`, `127.0.0.1`, or `::1`, plus stable Microsoft Edge. It builds and
starts the production application, uses an isolated mobile browser context, and
removes its generated user after the run:

```bash
npm run e2e
```

Set `FINARA_E2E_PORT` when port 3000 is already occupied. The validated port is
used consistently by the production server, Playwright base URL, and Better
Auth test origin:

```bash
FINARA_E2E_PORT=3100 npm run e2e
```

GitHub Actions repeats frozen installation, migrations, lint, type checking,
unit and PostgreSQL integration checks, production-runtime dependency audit,
production build, and all mobile Edge journeys. It uses only an ephemeral CI
database and test-only auth secret. Live NVIDIA checks are intentionally opt-in
and stay outside pull request CI:

```bash
npm run ai:check:nvidia
npm run ai:eval:transactions
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
