export const PageFallback = () => (
  <div
    aria-busy="true"
    aria-label="Cargando página"
    className="flex min-h-[40vh] items-center justify-center"
    role="status"
  >
    <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);
