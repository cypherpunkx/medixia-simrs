import { SatusehatEnvironment } from "./types";

export const SATUSEHAT_CONFIG = {
  endpoints: {
    staging: {
      auth: "https://api-satusehat-stg.dto.kemkes.go.id/oauth2/v1",
      fhir: "https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1",
      consent: "https://api-satusehat-stg.dto.kemkes.go.id/consent/v1",
      kyc: "https://api-satusehat-stg.dto.kemkes.go.id/kyc/v1",
    },
    production: {
      auth: "https://api-satusehat.kemkes.go.id/oauth2/v1",
      fhir: "https://api-satusehat.kemkes.go.id/fhir-r4/v1",
      consent: "https://api-satusehat.kemkes.go.id/consent/v1",
      kyc: "https://api-satusehat.kemkes.go.id/kyc/v1",
    },
  },
  authPath: "/accesstoken?grant_type=client_credentials",
  docsUrl: "https://satusehat.kemkes.go.id/platform/docs/id",
  portalUrl: "https://satusehat.kemkes.go.id/platform",
  tokenBufferSeconds: 60, // Refresh token 60s before it actually expires
  timeoutMs: 15000,
};

export function getSatusehatAuthUrl(env: SatusehatEnvironment): string {
  const base =
    env === "production"
      ? SATUSEHAT_CONFIG.endpoints.production.auth
      : SATUSEHAT_CONFIG.endpoints.staging.auth;
  return `${base}${SATUSEHAT_CONFIG.authPath}`;
}

export function getSatusehatFhirUrl(env: SatusehatEnvironment): string {
  return env === "production"
    ? SATUSEHAT_CONFIG.endpoints.production.fhir
    : SATUSEHAT_CONFIG.endpoints.staging.fhir;
}

export function getSatusehatConsentUrl(env: SatusehatEnvironment): string {
  return env === "production"
    ? SATUSEHAT_CONFIG.endpoints.production.consent
    : SATUSEHAT_CONFIG.endpoints.staging.consent;
}
