type VisualToastrMethod = 'error' | 'info' | 'success' | 'warning';
type VisualToastrRuntime = Partial<Record<VisualToastrMethod, (...args: unknown[]) => unknown>>;

function callVisualToastr(method: VisualToastrMethod, args: unknown[]) {
  const runtime = (globalThis as unknown as { toastr?: VisualToastrRuntime }).toastr;
  return runtime?.[method]?.(...args);
}

export default {
  error: (...args: unknown[]) => callVisualToastr('error', args),
  info: (...args: unknown[]) => callVisualToastr('info', args),
  success: (...args: unknown[]) => callVisualToastr('success', args),
  warning: (...args: unknown[]) => callVisualToastr('warning', args),
};
