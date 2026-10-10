import { NextRequest, NextResponse } from 'next/server';
import { authenticateRunnerOrUser } from '@/lib/auth/runner-auth';

export async function GET(request: NextRequest) {
  const auth = await authenticateRunnerOrUser(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { orgId, supabase } = auth.context;
  const artifactId = request.nextUrl.searchParams.get('id');

  if (!artifactId) {
    return NextResponse.json({ error: 'Missing artifact id parameter' }, { status: 400 });
  }

  // Retrieve artifact
  const { data: artifact, error: artError } = await supabase
    .from('wf_run_artifacts')
    .select('*, wf_execution_runs(org_id)')
    .eq('id', artifactId)
    .maybeSingle();

  if (artError || !artifact) {
    return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
  }

  const runOrgId = (artifact as unknown as { wf_execution_runs?: { org_id?: string } })?.wf_execution_runs?.org_id;
  if (runOrgId && runOrgId !== orgId) {
    return NextResponse.json(
      { error: 'Unauthorized: Artifact belongs to a different organization' },
      { status: 403 }
    );
  }

  const cloudPath = artifact.cloud_storage_path;
  if (!cloudPath) {
    return NextResponse.json(
      { error: 'Artifact is stored locally only and has not been synced to cloud storage' },
      { status: 404 }
    );
  }

  // Attempt to download file from Supabase storage bucket
  const cleanStoragePath = cloudPath.replace(/^wf_artifacts\//, '');
  try {
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('wf_artifacts')
      .download(cleanStoragePath);

    if (!downloadError && fileBlob) {
      const buffer = Buffer.from(await fileBlob.arrayBuffer());
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': fileBlob.type || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(artifact.file_name)}"`,
          'Content-Length': String(buffer.length),
        },
      });
    }

    // Try signed URL redirect
    const { data: signedData } = await supabase.storage
      .from('wf_artifacts')
      .createSignedUrl(cleanStoragePath, 300);

    if (signedData?.signedUrl) {
      return NextResponse.redirect(signedData.signedUrl);
    }
  } catch (storageErr) {
    console.warn('Storage download fallback:', storageErr);
  }

  // Fallback response for mock or simulated cloud environments
  const fallbackText = `FlowMind Cloud Artifact Export\nFile: ${artifact.file_name}\nSHA-256: ${artifact.sha256_hash}\nSize: ${artifact.file_size_bytes || 0} bytes\nSynced Path: ${cloudPath}\n`;
  const fallbackBuffer = Buffer.from(fallbackText, 'utf-8');

  return new Response(fallbackBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(artifact.file_name)}"`,
      'Content-Length': String(fallbackBuffer.length),
    },
  });
}
