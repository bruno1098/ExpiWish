import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { error: 'Endpoint não implementado - firebase-admin não está configurado' },
    { status: 501 }
  );
} 