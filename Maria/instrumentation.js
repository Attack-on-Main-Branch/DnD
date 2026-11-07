export async function register() {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    (!process.env.VERCEL &&
      !process.env.OTEL_EXPORTER_OTLP_ENDPOINT &&
      !process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT)
  ) {
    return;
  }

  const { registerOTel } = await import("@vercel/otel");
  registerOTel({ serviceName: "grimoire-tales" });
}
