import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => {
  const publicUrl = env('PUBLIC_URL', '').replace(/\/+$/, '');

  return {
    host: env('HOST', '0.0.0.0'),
    port: env.int('PORT', 1337),
    ...(publicUrl ? { url: publicUrl } : {}),
    proxy: env.bool('IS_PROXIED', env('NODE_ENV', 'development') === 'production'),
    app: {
      keys: env.array('APP_KEYS'),
    },
  };
};

export default config;
