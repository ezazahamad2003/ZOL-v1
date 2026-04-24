import { NextResponse } from 'next/server'
export async function POST() {
  return NextResponse.json({ error: 'Endpoint removed in MVP1. Quotes feature dropped.' }, { status: 410 })
}
