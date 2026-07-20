import {
  assertPasswordRateLimitSecret,
  createRateLimitedChangePasswordController,
} from '../../lib/passwordRateLimit';

export default (plugin: any) => {
  const originalControllers = plugin.controllers;
  const originalAuthControllerFactory = plugin.controllers.auth;
  const originalRegister = plugin.register;

  plugin.register = async ({ strapi }: { strapi: any }) => {
    assertPasswordRateLimitSecret(process.env.PASSWORD_RATE_LIMIT_SECRET);
    return originalRegister.call(plugin, { strapi });
  };

  plugin.controllers.auth = ({ strapi }: { strapi: any }) => {
    const authController = originalAuthControllerFactory.call(originalControllers, { strapi });

    authController.changePassword = createRateLimitedChangePasswordController({
      getConnection: () => strapi.db.connection,
      getSecret: () => process.env.PASSWORD_RATE_LIMIT_SECRET,
      originalChangePassword: authController.changePassword,
    });

    return authController;
  };

  return plugin;
};
