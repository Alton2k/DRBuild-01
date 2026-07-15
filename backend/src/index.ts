import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { hasImmutableUserSettingChange } from './api/user-setting/utils/immutability';

const userHandleMinLength = 3;
const userHandleMaxLength = 24;
const userSettingUid = 'api::user-setting.user-setting';
const userSettingListColumns = ['userId', 'username', 'displayName', 'ownerUsername', 'ownerEmail'];
const userSettingContentManagerStoreKey = `configuration_content_types::${userSettingUid}`;

type ContentManagerContentTypeService = {
  findContentType(uid: string): unknown;
  findConfiguration(contentType: unknown): Promise<{
    layouts?: {
      list?: string[];
      edit?: unknown;
    };
    [key: string]: unknown;
  }>;
  updateConfiguration(contentType: unknown, configuration: Record<string, unknown>): Promise<unknown>;
};

type ContentManagerConfiguration = {
  settings?: Record<string, unknown>;
  metadatas?: Record<string, unknown>;
  layouts?: {
    list?: string[];
    edit?: unknown;
  };
  [key: string]: unknown;
};

function isUniqueConstraintError(error: unknown) {
  const candidate = error as { code?: string | number; message?: string; details?: { error?: unknown } };
  const message = `${candidate?.message ?? ''} ${JSON.stringify(candidate?.details ?? {})}`;

  return candidate?.code === '23505' || candidate?.code === 'SQLITE_CONSTRAINT' || /unique|duplicate/i.test(message);
}

function createUserHandleCandidate(value: string, fallback = 'member') {
  const candidate = (value || fallback)
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, '_')
    .replace(/^[^a-z0-9_]+/, '')
    .replace(/[^a-z0-9_]+$/, '')
    .slice(0, userHandleMaxLength);

  return (candidate || fallback).padEnd(userHandleMinLength, '_').slice(0, userHandleMaxLength);
}

async function createUniqueProfileUserName(strapi: Core.Strapi, userId: string, preferredUserName: string) {
  const base = createUserHandleCandidate(preferredUserName);
  const existing = await strapi.db.query('api::user-setting.user-setting').findOne({
    where: { username: { $eqi: base } },
  });

  if (!existing || existing.userId === userId) {
    return base;
  }

  const suffix = `_${userId}`;
  return createUserHandleCandidate(`${base.slice(0, userHandleMaxLength - suffix.length)}${suffix}`);
}

async function ensureUserSettingForUser(strapi: Core.Strapi, user: { id: number | string; username?: string | null; email?: string | null }) {
  const userId = String(user.id);
  const ownerUsername = user.username || '';
  const ownerEmail = user.email || '';
  const existing = await strapi.db.query('api::user-setting.user-setting').findOne({
    where: { userId },
  });

  if (existing) {
    const data: Record<string, string> = {};

    if (ownerUsername && existing.ownerUsername !== ownerUsername) {
      data.ownerUsername = ownerUsername;
    }

    if (ownerEmail && existing.ownerEmail !== ownerEmail) {
      data.ownerEmail = ownerEmail;
    }

    if (!existing.displayName && (ownerUsername || ownerEmail)) {
      data.displayName = ownerUsername || ownerEmail;
    }

    if (!existing.username) {
      data.username = await createUniqueProfileUserName(strapi, userId, ownerUsername || ownerEmail || `member-${userId}`);
    }

    if (Object.keys(data).length > 0) {
      await strapi.db.query('api::user-setting.user-setting').update({
        where: { id: existing.id },
        data,
      });
    }

    return;
  }

  const displayName = ownerUsername || ownerEmail || `member-${userId}`;
  const username = await createUniqueProfileUserName(strapi, userId, displayName);

  try {
    await strapi.db.query('api::user-setting.user-setting').create({
      data: {
        userId,
        ownerUsername,
        ownerEmail,
        username,
        displayName: displayName,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }
  }
}

async function ensureUserSettingsForExistingUsers(strapi: Core.Strapi) {
  const users = await strapi.db.query('plugin::users-permissions.user').findMany({
    select: ['id', 'username', 'email'],
    limit: 1000,
  });

  for (const user of users) {
    await ensureUserSettingForUser(strapi, user).catch((error) => {
      strapi.log.error(`Could not create user setting for user ${user.id}`, error);
    });
  }
}

async function ensureUserSettingListColumns(strapi: Core.Strapi) {
  const contentManagerStore = strapi.store({ type: 'plugin', name: 'content_manager' });
  const storedConfiguration = await contentManagerStore.get({
    key: userSettingContentManagerStoreKey,
  }) as ContentManagerConfiguration | null;
  const configuration = storedConfiguration ?? {};
  const currentList = configuration.layouts?.list ?? [];
  const nextList = Array.from(new Set([...userSettingListColumns, ...currentList]))
    .filter((column) => !['profileAvatarUrl', 'profileUserName', 'profileBio'].includes(column));
  const nextMetadatas = {
    ...(configuration.metadatas ?? {}),
    username: {
      edit: { label: 'username', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'username', searchable: true, sortable: true },
    },
    displayName: {
      edit: { label: 'displayName', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'displayName', searchable: true, sortable: true },
    },
    ownerUsername: {
      edit: { label: 'ownerUsername', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'ownerUsername', searchable: true, sortable: true },
    },
    ownerEmail: {
      edit: { label: 'ownerEmail', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'ownerEmail', searchable: true, sortable: true },
    },
  };
  const nextConfiguration = {
    ...configuration,
    uid: userSettingUid,
    settings: {
      ...(configuration.settings ?? {}),
      mainField: 'username',
      defaultSortBy: 'userId',
    },
    metadatas: nextMetadatas,
    layouts: {
      ...(configuration.layouts ?? {}),
      list: nextList,
    },
  };

  await contentManagerStore.set({
    key: userSettingContentManagerStoreKey,
    value: nextConfiguration,
  });

  const contentManager = strapi.plugin('content-manager');
  const contentTypeService = contentManager.service('content-types') as ContentManagerContentTypeService;
  const contentType = contentTypeService.findContentType(userSettingUid);

  if (!contentType) {
    return;
  }

  const syncedConfiguration = await contentTypeService.findConfiguration(contentType);
  const syncedList = syncedConfiguration.layouts?.list ?? [];
  const nextSyncedList = Array.from(new Set([...userSettingListColumns, ...syncedList]))
    .filter((column) => !['profileAvatarUrl', 'profileUserName', 'profileBio'].includes(column));

  if (nextSyncedList.join('|') === syncedList.join('|')) {
    return;
  }

  await contentTypeService.updateConfiguration(contentType, {
    ...syncedConfiguration,
    layouts: {
      ...(syncedConfiguration.layouts ?? {}),
      list: nextSyncedList,
    },
  });
}

async function ensureUniqueIndex(strapi: Core.Strapi, tableName: string, columnName: string, indexName: string) {
  const knex = strapi.db.connection;

  if (!(await knex.schema.hasTable(tableName)) || !(await knex.schema.hasColumn(tableName, columnName))) {
    return;
  }

  try {
    await knex.schema.alterTable(tableName, (table) => {
      table.unique([columnName], { indexName });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already exists|duplicate key name|relation .* already exists/i.test(message)) {
      throw error;
    }
  }
}

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
    strapi.db.lifecycles.subscribe({
      models: ['plugin::users-permissions.user'],
      async afterCreate(event) {
        await ensureUserSettingForUser(strapi, event.result).catch((error) => {
          strapi.log.error('Could not create user setting for new user', error);
        });
      },
    });

    strapi.db.lifecycles.subscribe({
      models: ['api::user-setting.user-setting'],
      async beforeUpdate(event) {
        const patch = event.params.data as { userId?: unknown; username?: unknown } | undefined;

        if (!patch || (patch.userId === undefined && patch.username === undefined)) {
          return;
        }

        const existing = await strapi.db.query('api::user-setting.user-setting').findOne({
          where: event.params.where,
        });

        if (!existing) {
          return;
        }

        const immutableChange = hasImmutableUserSettingChange(existing, patch);

        if (immutableChange.changesUserId) {
          throw new errors.ValidationError('The account owner cannot be changed.');
        }

        if (immutableChange.changesHandle) {
          throw new errors.ValidationError('The profile handle cannot be changed.');
        }
      },
    });

    await ensureUserSettingsForExistingUsers(strapi);
    await ensureUserSettingListColumns(strapi);
    await ensureUniqueIndex(strapi, 'comment_reports', 'report_key', 'comment_reports_report_key_uq');
    await ensureUniqueIndex(strapi, 'comments', 'submission_key', 'comments_submission_key_uq');

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
