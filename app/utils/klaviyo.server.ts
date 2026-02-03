export type KlaviyoEventInput = {
  apiKey: string;
  eventName: string;
  email: string;
  properties?: Record<string, unknown>;
  value?: number | null;
};

const KLAVIYO_REVISION = "2024-10-15";

export async function sendKlaviyoEvent({
  apiKey,
  eventName,
  email,
  properties,
  value,
}: KlaviyoEventInput) {
  const payload = {
    data: {
      type: "event",
      attributes: {
        metric: {
          data: {
            type: "metric",
            attributes: { name: eventName },
          },
        },
        profile: {
          data: {
            type: "profile",
            attributes: { email },
          },
        },
        properties: properties || {},
        ...(typeof value === "number" ? { value } : {}),
        unique_id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `event_${Date.now()}`,
      },
    },
  };

  const response = await fetch("https://a.klaviyo.com/api/events/", {
    method: "POST",
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      revision: KLAVIYO_REVISION,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Klaviyo error ${response.status}: ${
        message || response.statusText || "Unknown error"
      }`,
    );
  }

  return response.json().catch(() => ({}));
}
