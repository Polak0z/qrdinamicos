import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request, { params }) {
  // En Next.js 15, `params` puede necesitar un await. Para mantener compatibilidad con 13/14, lo leemos directamente.
  const { slug } = params;

  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
  }

  // 1. Buscar el QR en Supabase
  const { data: qrData, error: fetchError } = await supabase
    .from('dynamic_qrs')
    .select('id, target_url')
    .eq('slug', slug)
    .single();

  if (fetchError || !qrData) {
    return new NextResponse('QR no encontrado o desactivado', { status: 404 });
  }

  // 2. Extraer información del request (User Agent)
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  let deviceType = 'Desktop';
  if (/mobile/i.test(userAgent)) deviceType = 'Mobile';
  if (/tablet/i.test(userAgent)) deviceType = 'Tablet';

  // 3. Registrar el escaneo asíncronamente (sin await) para máxima velocidad
  supabase
    .from('scan_events')
    .insert([
      {
        qr_id: qrData.id,
        user_agent: userAgent,
        device_type: deviceType,
      }
    ])
    .then(({ error }) => {
      if (error) console.error('Error registrando escaneo:', error);
    });

  // 4. Redirección HTTP 307
  return NextResponse.redirect(qrData.target_url, 307);
}
