import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', time: new Date().toISOString() });
}

// 避免缓存这个路由的结果
export const dynamic = 'force-dynamic'; 