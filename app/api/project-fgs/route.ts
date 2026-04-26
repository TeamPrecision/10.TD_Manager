// Deprecated — use /api/fixtures and /api/fixture-fgs instead
export async function POST() {
  return Response.json({ error: "Use /api/fixtures and /api/fixture-fgs" }, { status: 410 });
}

export async function DELETE() {
  return Response.json({ error: "Use /api/fixture-fgs/[id]" }, { status: 410 });
}
