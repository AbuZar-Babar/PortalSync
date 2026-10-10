import { NextRequest, NextResponse } from 'next/server';
import { authenticateRunnerOrUser } from '@/lib/auth/runner-auth';

export async function POST(request: NextRequest) {
  const auth = await authenticateRunnerOrUser(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { orgId, supabase } = auth.context;

  try {
    const contentType = request.headers.get('content-type') || '';
    let runId: string = '';
    let fileName: string = '';
    let fileSize: number = 0;
    let sha256Hash: string = '';
    let fileBuffer: Buffer | null = null;
    let storagePath: string | null = null;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      runId = body.run_id;
      fileName = body.file_name;
      fileSize = body.file_size_bytes || 0;
      sha256Hash = body.sha256_hash || '';
      storagePath = body.storage_path || null;
      if (body.file_data) {
        fileBuffer = Buffer.from(body.file_data, 'base64');
        fileSize = fileSize || fileBuffer.length;
      }
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      runId = (formData.get('run_id') as string) || '';
      fileName = (formData.get('file_name') as string) || '';
      sha256Hash = (formData.get('sha256_hash') as string) || '';
      storagePath = (formData.get('storage_path') as string) || null;
      const file = formData.get('file') as File | null;
      if (file) {
        fileName = fileName || file.name;
        fileSize = file.size;
        const arrayBuf = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuf);
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported Content-Type. Expected application/json or multipart/form-data' },
        { status: 400 }
      );
    }

    if (!runId || !fileName) {
      return NextResponse.json(
        { error: 'Missing required fields: run_id and file_name' },
        { status: 400 }
      );
    }

    // Verify run belongs to the caller's organization
    const { data: run, error: runError } = await supabase
      .from('wf_execution_runs')
      .select('id, org_id')
      .eq('id', runId)
      .maybeSingle();

    if (runError || !run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    if (run.org_id !== orgId) {
      return NextResponse.json(
        { error: 'Unauthorized: Run belongs to a different organization' },
        { status: 403 }
      );
    }

    const cloudPath = `${orgId}/${runId}/${fileName}`;
    let uploadSuccess = false;

    if (fileBuffer) {
      try {
        const { error: uploadErr } = await supabase.storage
          .from('wf_artifacts')
          .upload(cloudPath, fileBuffer, {
            contentType: 'application/octet-stream',
            upsert: true,
          });

        if (!uploadErr) {
          uploadSuccess = true;
        }
      } catch (storageErr) {
        console.warn('Supabase storage upload error:', storageErr);
      }
    }

    const finalCloudPath = `wf_artifacts/${cloudPath}`;

    // Optionally update or create artifact record
    if (sha256Hash) {
      try {
        await supabase
          .from('wf_run_artifacts')
          .upsert(
            {
              run_id: runId,
              file_name: fileName,
              file_size_bytes: fileSize,
              sha256_hash: sha256Hash,
              cloud_storage_path: finalCloudPath,
              item_metadata: {
                uploaded_to_cloud: true,
                uploaded_at: new Date().toISOString(),
                ...(storagePath ? { storage_path: storagePath } : {}),
              },
            },
            { onConflict: 'run_id,sha256_hash' }
          );
      } catch {
        // ignore upsert error if table/record not ready
      }
    }

    return NextResponse.json(
      {
        success: true,
        cloud_storage_path: finalCloudPath,
        path: finalCloudPath,
        file_name: fileName,
        file_size_bytes: fileSize,
        uploaded_to_storage: uploadSuccess,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
