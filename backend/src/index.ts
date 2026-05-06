import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const pluginStore = strapi.store({ type: 'plugin', name: 'users-permissions' });
    const advancedSettings = await pluginStore.get({ key: 'advanced' }) as Record<string, unknown> | null;

    await pluginStore.set({
      key: 'advanced',
      value: {
        unique_email: true,
        allow_register: true,
        email_reset_password: null,
        default_role: 'authenticated',
        ...(advancedSettings ?? {}),
        // TODO: Re-enable after choosing an email provider for verification emails.
        email_confirmation: false,
        email_confirmation_redirection:
          process.env.FRONTEND_URL ?? 'http://localhost:3000/auth?message=email-confirmed',
      },
    });
  },
};
