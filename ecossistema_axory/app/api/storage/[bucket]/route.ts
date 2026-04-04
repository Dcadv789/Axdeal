import {
  DeleteObjectsCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';

const storageEndpoint = (process.env.MINIO_ENDPOINT ?? 'https://storage.axory.com.br').trim();
const storageRegion = (process.env.MINIO_REGION ?? 'us-east-1').trim();
const accessKeyId = (process.env.MINIO_ACCESS_KEY_ID ?? '').trim();
const secretAccessKey = (process.env.MINIO_SECRET_ACCESS_KEY ?? '').trim();

const buildS3Client = () => {
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'MinIO nao configurado. Defina MINIO_ACCESS_KEY_ID e MINIO_SECRET_ACCESS_KEY nas variaveis de ambiente do servidor.'
    );
  }

  return new S3Client({
    endpoint: storageEndpoint,
    region: storageRegion,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

const getBucket = (bucketParam: string) => decodeURIComponent(bucketParam || '').trim();

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Erro inesperado ao acessar o storage.';

export async function POST(
  request: NextRequest,
  { params }: { params: { bucket: string } }
) {
  try {
    const { bucket: bucketParam } = params;
    const bucket = getBucket(bucketParam);

    if (!bucket) {
      return NextResponse.json({ error: 'Bucket nao informado.' }, { status: 400 });
    }

    const formData = await request.formData();
    const path = String(formData.get('path') || '').trim();
    const upsert = String(formData.get('upsert') || 'false') === 'true';
    const cacheControl = String(formData.get('cacheControl') || '').trim();
    const contentType = String(formData.get('contentType') || '').trim();
    const file = formData.get('file');

    if (!path) {
      return NextResponse.json({ error: 'Path nao informado.' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo invalido.' }, { status: 400 });
    }

    const s3 = buildS3Client();

    if (!upsert) {
      try {
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: path }));
        return NextResponse.json({ error: 'Ja existe um arquivo nesse path.' }, { status: 409 });
      } catch (error) {
        if (
          !(error instanceof S3ServiceException) ||
          (error.$metadata.httpStatusCode && error.$metadata.httpStatusCode !== 404)
        ) {
          throw error;
        }
      }
    }

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: path,
        Body: Buffer.from(await file.arrayBuffer()),
        CacheControl: cacheControl || undefined,
        ContentType: contentType || file.type || 'application/octet-stream',
      })
    );

    return NextResponse.json({ data: { path } });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { bucket: string } }
) {
  try {
    const { bucket: bucketParam } = params;
    const bucket = getBucket(bucketParam);

    if (!bucket) {
      return NextResponse.json({ error: 'Bucket nao informado.' }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as { paths?: string[] } | null;
    const paths = (body?.paths || []).map((path) => path.trim()).filter(Boolean);

    if (paths.length === 0) {
      return NextResponse.json({ error: 'Nenhum path informado.' }, { status: 400 });
    }

    const s3 = buildS3Client();
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: paths.map((path) => ({ Key: path })),
          Quiet: true,
        },
      })
    );

    return NextResponse.json({ data: { paths } });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
