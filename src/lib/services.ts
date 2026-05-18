import { Service } from "./types";

/** Намиране на услуга по ID от зареден списък */
export function getServiceById(
  services: Service[],
  id: string
): Service | undefined {
  return services.find((s) => s.id === id);
}
