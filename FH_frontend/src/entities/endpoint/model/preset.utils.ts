import { PRESET_CATALOG, CUSTOM_SERVICE_ID } from "@/entities/endpoint/model/presets";
import type { Endpoint } from "@/entities/endpoint/model/endpoint.schema";

export function isHeadersEqual(
  presetHeaders: Record<string, string>,
  currentHeaders: Record<string, string> = {},
): boolean {
  const presetKeys = Object.keys(presetHeaders);
  const currentKeys = Object.keys(currentHeaders);
  if (presetKeys.length !== currentKeys.length) return false;
  return presetKeys.every((key) => presetHeaders[key] === currentHeaders[key]);
}

export function findInitialServiceId(cfg: Endpoint["mockConfig"]): string {
  if (!cfg) return CUSTOM_SERVICE_ID;
  for (const service of PRESET_CATALOG) {
    for (const scenario of service.scenarios) {
      if (
        scenario.statusCode === cfg.statusCode &&
        scenario.delayMs === (cfg.delayMs ?? 0) &&
        scenario.body === (cfg.body ?? "ok") &&
        isHeadersEqual(scenario.headers, cfg.headers)
      ) {
        return service.id;
      }
    }
  }
  return CUSTOM_SERVICE_ID;
}

const PRESET_MAP = new Map(PRESET_CATALOG.map((s) => [s.id, s]));

export function findInitialScenarioId(
  cfg: Endpoint["mockConfig"],
  serviceId: string,
): string | null {
  if (!cfg || serviceId === CUSTOM_SERVICE_ID) return null;
  const service = PRESET_MAP.get(serviceId);
  if (!service) return null;
  const match = service.scenarios.find(
    (s) =>
      s.statusCode === cfg.statusCode &&
      s.delayMs === (cfg.delayMs ?? 0) &&
      s.body === (cfg.body ?? "ok") &&
      isHeadersEqual(s.headers, cfg.headers),
  );
  return match?.id ?? null;
}
