import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { path } = await request.json();

  if (!path || typeof path !== "string") {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  revalidatePath(path);
  return NextResponse.json({ revalidated: true });
}
