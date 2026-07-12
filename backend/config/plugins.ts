import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => {
  const endpoint = env('R2_ENDPOINT', '').replace(/\/+$/, '');
  const publicUrl = env('R2_PUBLIC_URL', '').replace(/\/+$/, '');
  const security = {
    allowedTypes: ['image/*'],
    deniedTypes: ['image/svg+xml'],
  };

  if (!endpoint) {
    return {
      upload: {
        config: { security },
      },
    };
  }

  return {
    upload: {
      config: {
        security,
        provider: 'aws-s3',
        providerOptions: {
          baseUrl: publicUrl || undefined,
          s3Options: {
            credentials: {
              accessKeyId: env('R2_ACCESS_KEY_ID'),
              secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
            },
            endpoint,
            region: 'auto',
            forcePathStyle: true,
            params: {
              ACL: undefined,
              Bucket: env('R2_BUCKET'),
            },
          },
        },
        actionOptions: {
          upload: {},
          uploadStream: {},
          delete: {},
        },
      },
    },
  };
};

export default config;
