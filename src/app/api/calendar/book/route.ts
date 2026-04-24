import { NextResponse } from 'next/server'
export async function POST() {
  return NextResponse.json({ error: 'Endpoint removed in MVP1. Use /api/agent/run with book_appointment tool.' }, { status: 410 })
}
