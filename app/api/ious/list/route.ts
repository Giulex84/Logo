import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ious: [],
    note: "This endpoint lists commitment records only",
  });
}
