/**
 * Helper functions to standardise API responses.
 */
export function ok(data: unknown, status: number = 200) {
  return Response.json({ data }, { status });
}

export function fail(code: string, message: string, status: number = 400) {
  return Response.json(
    {
      errors: { [code]: [message] },
      error_data: { [code]: { status } },
    },
    { status },
  );
}