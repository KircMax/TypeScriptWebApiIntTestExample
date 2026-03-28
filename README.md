# TypeScript SIMATIC S7 Web API Starter

This project is a minimal TypeScript setup using:

- `@siemens/simatic-s7-webserver-api`
- `dotenv`
- `tsx`

## 1) Install

```bash
npm install
```

## 2) Configure settings

You can choose either approach:

- Local JSON config (recommended for your use case)
- Environment variables

### Option A: local JSON config

Create `config.local.json` from `config.example.json` and fill in PLC details.

`config.local.json` is ignored by git.

Example shape:

```json
{
	"plc": {
		"address": "192.168.0.1",
		"protocol": "https",
		"username": "Admin",
		"password": "ChangeMe",
		"verifyTls": true,
		"certPath": ""
	}
}
```

### Option B: environment variables

Create a `.env` file based on `.env.example` and fill in your PLC details.

If you set `PLC_VERIFY_TLS=true`, also set `PLC_CERT_PATH` to your PLC certificate path.

### Precedence

If both are present, environment variables override `config.local.json` values.

### TLS behavior

- `verifyTls=false`: TLS server certificate is not validated.
- `verifyTls=true` and `certPath` provided: custom PLC certificate is used.
- `verifyTls=true` and no `certPath`: system trust store is used.
	- If PLC cert is not trusted there, the request is expected to fail.

## 3) Run the sample

```bash
npm start
```

Or press F5 in VS Code and choose `Debug SIMATIC S7 Starter`.

The sample flow in `src/index.ts` does:

1. Login (`ApiLogin`)
2. Read API version (`ApiVersion`)
3. Ping (`ApiPing`)
4. Browse API methods (`ApiBrowse`)
5. Browse web applications (`WebAppBrowse`)
6. Print results

## Useful scripts

```bash
npm run check
npm run build
```
