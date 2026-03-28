# TypeScript SIMATIC S7 Web API Starter

This project is a minimal TypeScript setup using:

- `@siemens/simatic-s7-webserver-api`
- `dotenv`
- `tsx`

## 1) Configure settings

You can choose either approach:

- Local JSON config (recommended for your use case)
- Environment variables

### Option A: local JSON config

Create `config.local.json` from `config.example.json` and fill in PLC details.

`config.local.json` is ignored by git.

### Option B: environment variables

Create a `.env` file based on `.env.example` and fill in your PLC details.

If you set `PLC_VERIFY_TLS=true`, also set `PLC_CERT_PATH` to your PLC certificate path.

### Precedence

If both are present, environment variables override `config.local.json` values.

## 2) Run the sample

```bash
npm start
```

The sample flow in `src/index.ts` does:

1. Login (`ApiLogin`)
2. Browse web applications (`WebAppBrowse`)
3. Print results

## Useful scripts

```bash
npm run check
npm run build
```
