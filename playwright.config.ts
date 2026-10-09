import { defineConfig, devices } from "@playwright/test";

// Las pruebas usan la misma configuración que la app (Supabase, contraseña demo).
try {
  process.loadEnvFile(".env.local");
} catch {
  // En CI las variables vienen del entorno.
}

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    ...devices["Pixel 7"],
    locale: "es-MX",
    // Centro de San Pedro; cada prueba puede moverse con context.setGeolocation.
    geolocation: { latitude: 25.6629, longitude: -100.4037 },
    permissions: ["geolocation"],
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
