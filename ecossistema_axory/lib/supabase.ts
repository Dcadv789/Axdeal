import { PostgrestClient } from '@supabase/postgrest-js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
const postgrestUrl = (process.env.NEXT_PUBLIC_POSTGREST_URL ?? 'https://rest-axdeal.axory.com.br').trim();
const storagePublicUrl = (
  process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL ?? 'https://storage.axory.com.br'
).trim().replace(/\/+$/, '');

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseConfigMessage =
  'Supabase Auth nao configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nas variaveis de ambiente.';

if (!isSupabaseConfigured) {
  console.warn(
    'Variaveis do Supabase Auth nao configuradas (NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY). Build liberado, mas autenticacao e requests autenticados ao PostgREST ficarao indisponiveis ate configurar as envs.'
  );
}

const authUrl = isSupabaseConfigured ? supabaseUrl : 'https://example.supabase.co';
const authKey = isSupabaseConfigured ? supabaseAnonKey : 'public-anon-placeholder';

const supabaseAuth = createClient(authUrl, authKey);

const withAuthHeaders = async (headersInit?: HeadersInit) => {
  const headers = new Headers(headersInit ?? {});
  if (supabaseAnonKey) {
    headers.set('apikey', supabaseAnonKey);
  }
  const {
    data: { session },
  } = await supabaseAuth.auth.getSession();

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  return headers;
};

const databaseClient = new PostgrestClient(postgrestUrl, {
  fetch: async (input, init) =>
    fetch(input, {
      ...init,
      headers: await withAuthHeaders(init?.headers),
    }),
});

const buildStoragePublicUrl = (bucket: string, path: string) =>
  `${storagePublicUrl}/${encodeURIComponent(bucket)}/${path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`;

const toError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

const toUploadFile = (
  file: File | Blob | ArrayBuffer | Uint8Array,
  contentType?: string
) => {
  if (file instanceof File) {
    return file;
  }

  if (file instanceof Blob) {
    return new File([file], 'upload.bin', {
      type: contentType || file.type || 'application/octet-stream',
    });
  }

  if (file instanceof Uint8Array) {
    return new File([new Uint8Array(file)], 'upload.bin', {
      type: contentType || 'application/octet-stream',
    });
  }

  return new File([file], 'upload.bin', {
    type: contentType || 'application/octet-stream',
  });
};

const createStorageBucketClient = (bucket: string) => ({
  async upload(
    path: string,
    file: File | Blob | ArrayBuffer | Uint8Array,
    options?: {
      cacheControl?: string;
      contentType?: string;
      upsert?: boolean;
    }
  ) {
    try {
      const formData = new FormData();
      const fileLike = toUploadFile(file, options?.contentType);

      formData.append('path', path);
      formData.append('file', fileLike);

      if (options?.cacheControl) {
        formData.append('cacheControl', options.cacheControl);
      }
      if (options?.contentType) {
        formData.append('contentType', options.contentType);
      }
      if (typeof options?.upsert === 'boolean') {
        formData.append('upsert', String(options.upsert));
      }

      const response = await fetch(`/api/storage/${encodeURIComponent(bucket)}`, {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as
        | { data?: { path: string }; error?: string }
        | null;

      if (!response.ok) {
        return {
          data: null,
          error: new Error(payload?.error || 'Nao foi possivel enviar o arquivo ao storage.'),
        };
      }

      return {
        data: { path: payload?.data?.path ?? path },
        error: null,
      };
    } catch (error) {
      return { data: null, error: toError(error) };
    }
  },

  async remove(paths: string[]) {
    try {
      const response = await fetch(`/api/storage/${encodeURIComponent(bucket)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { data?: { paths: string[] }; error?: string }
        | null;

      if (!response.ok) {
        return {
          data: null,
          error: new Error(payload?.error || 'Nao foi possivel remover o arquivo do storage.'),
        };
      }

      return {
        data: { paths: payload?.data?.paths ?? paths },
        error: null,
      };
    } catch (error) {
      return { data: null, error: toError(error) };
    }
  },

  getPublicUrl(path: string) {
    return {
      data: {
        publicUrl: buildStoragePublicUrl(bucket, path),
      },
    };
  },
});

export const supabase = {
  auth: supabaseAuth.auth,
  from: databaseClient.from.bind(databaseClient),
  rpc: databaseClient.rpc.bind(databaseClient),
  storage: {
    from: createStorageBucketClient,
  },
};
