import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) return new NextResponse('Missing URL', { status: 400 });

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=3600');

    return new NextResponse(blob, { headers });
  } catch (error) {
    return new NextResponse('Error fetching image', { status: 500 });
  }
}
