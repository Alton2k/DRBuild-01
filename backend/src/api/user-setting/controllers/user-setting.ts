/**
 * user-setting controller
 */

import { factories } from '@strapi/strapi';
import { hasImmutableUserSettingChange } from '../utils/immutability';

export default factories.createCoreController('api::user-setting.user-setting', ({ strapi }) => ({
  async update(ctx) {
    const documentId = String(ctx.params.documentId ?? ctx.params.id ?? '').trim();
    const data = ctx.request.body?.data;

    if (!documentId || !data || typeof data !== 'object') {
      return ctx.badRequest('A user-setting update is required.');
    }

    const existing = await strapi.db.query('api::user-setting.user-setting').findOne({
      where: /^\d+$/.test(documentId)
        ? { $or: [{ id: Number(documentId) }, { documentId }] }
        : { documentId },
    });

    if (!existing) {
      return ctx.notFound('User setting not found.');
    }

    const immutableChange = hasImmutableUserSettingChange(existing, data);

    if (immutableChange.changesUserId) {
      return ctx.badRequest('The account owner cannot be changed.');
    }

    if (immutableChange.changesHandle) {
      return ctx.badRequest('The profile handle cannot be changed.');
    }

    // Avoid writing immutable fields even when the submitted value is unchanged.
    delete data.userId;
    delete data.username;

    return super.update(ctx);
  },
}));
