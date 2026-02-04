export async function doThing(req: Request): Promise<Response> {
  const body = await req.json();
  return Response.json({ ok: true, body });
}
