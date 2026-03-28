import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";
import {
  ApiBrowse,
  ApiLogin,
  ApiPing,
  ApiVersion,
  RequestConfig,
  WebAppBrowse,
} from "@siemens/simatic-s7-webserver-api";

dotenv.config();

type PlcSettings = {
  address?: string;
  protocol?: string;
  username?: string;
  password?: string;
  verifyTls?: boolean;
  certPath?: string;
};

function loadJsonConfig(): PlcSettings {
  const localConfigPath = path.resolve("config.local.json");
  if (!fs.existsSync(localConfigPath)) {
    return {};
  }

  const raw = fs.readFileSync(localConfigPath, "utf-8");
  const parsed = JSON.parse(raw) as { plc?: PlcSettings };
  return parsed.plc ?? {};
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requiredResolved(
  name: string,
  value: string | undefined,
  options?: { allowEmpty?: boolean },
): string {
  if (value === undefined) {
    throw new Error(`Missing required setting: ${name}`);
  }

  if (!options?.allowEmpty && value.trim() === "") {
    throw new Error(`Missing required setting: ${name}`);
  }

  return value;
}

async function main(): Promise<void> {
  const jsonSettings = loadJsonConfig();

  const resolved = {
    address: process.env.PLC_ADDRESS ?? jsonSettings.address,
    protocol: process.env.PLC_PROTOCOL ?? jsonSettings.protocol ?? "https",
    username: process.env.PLC_USERNAME ?? jsonSettings.username,
    password: process.env.PLC_PASSWORD ?? jsonSettings.password,
    verifyTls:
      process.env.PLC_VERIFY_TLS !== undefined
        ? process.env.PLC_VERIFY_TLS.toLowerCase() === "true"
        : (jsonSettings.verifyTls ?? false),
    certPath: process.env.PLC_CERT_PATH ?? jsonSettings.certPath,
  };

  const config = new RequestConfig();
  config.address = requiredResolved("PLC_ADDRESS or plc.address", resolved.address);
  config.protocol = resolved.protocol;

  config.verifyTls = resolved.verifyTls;

  if (resolved.verifyTls) {
    if (resolved.certPath && resolved.certPath.trim() !== "") {
      const absoluteCertPath = path.resolve(resolved.certPath);
      config.plcCertificate = fs.readFileSync(absoluteCertPath);
      console.log("TLS verification enabled with configured PLC certificate.");
    } else {
      console.log("TLS verification enabled using system trust store (no PLC cert path configured).");
    }
  }

  const login = await new ApiLogin(
    config,
    requiredResolved("PLC_USERNAME or plc.username", resolved.username),
    requiredResolved("PLC_PASSWORD or plc.password", resolved.password, { allowEmpty: true }),
    false,
  ).execute();

  if (!login || !login.result) {
    throw new Error("Login failed. No token returned by PLC.");
  }

  console.log("Login successful. Token received.");

  const version = await new ApiVersion(config).execute();
  console.log("API version:", version?.result ?? "unknown");

  const ping = await new ApiPing(config).execute();
  console.log("Ping response:", ping?.result ?? "unknown");

  const apiBrowse = await new ApiBrowse(config).execute();
  console.log("ApiBrowse response:", apiBrowse?.result ?? "unknown");

  const webApps = await new WebAppBrowse(config).execute();

  if (!webApps || !webApps.result) {
    console.log("WebAppBrowse returned no results.");
    return;
  }

  console.log("Max applications:", webApps.result.max_applications);
  console.log("Applications:");
  for (const app of webApps.result.applications) {
    console.log("-", app);
  }
}

main().catch((error: unknown) => {
  console.error("Request failed:", error);
  process.exitCode = 1;
});
