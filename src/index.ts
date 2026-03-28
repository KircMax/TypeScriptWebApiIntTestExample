import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";
import {
  ApiBrowse,
  ApiGetPermissions,
  ApiLogin,
  ApiLogout,
  ApiPing,
  ApiVersion,
  JsonrpcBaseRequest,
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

async function executeWithAuth<T extends JsonrpcBaseRequest>(
  request: T,
  authToken: string,
): Promise<ReturnType<T["execute"]>> {
  request.token = authToken;
  return request.execute() as ReturnType<T["execute"]>;
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

  const authToken = login.result;

  console.log("Login successful. Token received.");

  try {
    const permissions = await executeWithAuth(new ApiGetPermissions(config), authToken);
    console.log("Permissions response:", permissions?.result ?? "unknown");

    const version = await executeWithAuth(new ApiVersion(config), authToken);
    console.log("API version:", version?.result ?? "unknown");

    const ping = await executeWithAuth(new ApiPing(config), authToken);
    console.log("Ping response:", ping?.result ?? "unknown");

    const apiBrowse = await executeWithAuth(new ApiBrowse(config), authToken);
    console.log("ApiBrowse response:", apiBrowse?.result ?? "unknown");

    const webApps = await executeWithAuth(new WebAppBrowse(config), authToken);

    if (!webApps || !webApps.result) {
      console.log("WebAppBrowse returned no results.");
      return;
    }

    console.log("Max applications:", webApps.result.max_applications);
    console.log("Applications:");
    for (const app of webApps.result.applications) {
      console.log("-", app);
    }
  } finally {
    try {
      const logout = await new ApiLogout(config, authToken).execute();
      console.log("Logout response:", logout?.result ?? "unknown");
    } catch (logoutError: unknown) {
      console.error("Logout failed:", logoutError);
    }
  }
}

main().catch((error: unknown) => {
  console.error("Request failed:", error);
  process.exitCode = 1;
});
