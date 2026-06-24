"use client";

import { useEffect, useMemo, useState } from "react";
import { saveAccountSettingsAction } from "./actions";
import {
  AccountSettings,
  SettingsTheme,
  ToggleKey,
  profileBioLimit,
  profileSettingsChangedEventName,
  profileSettingsStorageKey,
  profileUserNameMinLength,
  togglesStorageKey,
} from "@/lib/accountSettings";
import { NotificationToggle, SmallButton, StaticField, TextInput } from "./SettingsControls";

type SettingsUser = {
  id: string;
  email: string;
  displayName: string;
  joinedAt: string;
};

type SettingsClientProps = {
  user: SettingsUser;
  initialSettings: AccountSettings;
};

type FormState = {
  avatarUrl: string;
  userName: string;
  bio: string;
  email: string;
  theme: SettingsTheme;
};

type DangerAction = "deactivate" | "delete";
type ProfileSnapshot = Pick<FormState, "avatarUrl" | "userName" | "bio">;
type SaveStatus = {
  state: "idle" | "pending" | "success" | "error";
  message: string;
};

const avatarMaxSize = 320;
const avatarDataUrlLimit = 450_000;
const avatarImageQuality = 0.82;
const themeStorageKey = "dealmy_theme";
const themeModeChangedEventName = "dealmy:theme-mode-changed";

const notificationToggles: { key: ToggleKey; label: string; description: string }[] = [
  {
    key: "newComments",
    label: "New comments on my deals",
    description: "When someone starts a discussion on a deal you posted.",
  },
  {
    key: "commentReplies",
    label: "Replies to my comments",
    description: "Direct replies and mentions in community threads.",
  },
  {
    key: "dealApproval",
    label: "Deal approval notifications",
    description: "Updates when submitted deals are approved or need edits.",
  },
  {
    key: "savedDealUpdates",
    label: "Saved deal updates",
    description: "Price, stock, expiry, and discussion changes for saved deals.",
  },
  {
    key: "weeklySummary",
    label: "Weekly summary",
    description: "A tidy recap of deals, votes, and community activity.",
  },
  {
    key: "marketingEmails",
    label: "Marketing emails",
    description: "Product news, partner campaigns, and seasonal promotions.",
  },
];

const privacyToggles: { key: ToggleKey; label: string; description: string }[] = [
  {
    key: "publicProfile",
    label: "Public Profile",
    description: "Allow other members to view your community profile.",
  },
  {
    key: "showJoinDate",
    label: "Show Join Date",
    description: "Display the month and year you joined Deal Rakyat.",
  },
  {
    key: "showActivityStats",
    label: "Show Activity Stats",
    description: "Share counts for posted deals, comments, and votes.",
  },
  {
    key: "showSavedDeals",
    label: "Show Saved Deals",
    description: "Let visitors browse deals you have saved.",
  },
  {
    key: "allowFollowers",
    label: "Allow Followers",
    description: "Let members follow your future deal submissions.",
  },
];

const dangerContent: Record<DangerAction, { title: string; description: string; confirm: string }> = {
  deactivate: {
    title: "Deactivate account",
    description: "Temporarily suspend your profile and hide public activity until you sign back in.",
    confirm: "Deactivate Account",
  },
  delete: {
    title: "Delete account",
    description: "Permanently delete your account and remove personal data that is not required for platform integrity.",
    confirm: "Delete Account",
  },
};

function createInitialForm(user: SettingsUser, settings: AccountSettings): FormState {
  return {
    avatarUrl: settings.profile.avatarUrl,
    userName: settings.profile.userName || user.displayName,
    bio: settings.profile.bio,
    email: user.email,
    theme: settings.theme,
  };
}

function createProfileSnapshot(form: FormState): ProfileSnapshot {
  return {
    avatarUrl: form.avatarUrl,
    userName: form.userName,
    bio: form.bio,
  };
}

function isSameProfileSnapshot(left: ProfileSnapshot, right: ProfileSnapshot) {
  return (
    left.avatarUrl === right.avatarUrl &&
    left.userName === right.userName &&
    left.bio === right.bio
  );
}

function createInitialToggles(settings: AccountSettings) {
  return settings.toggles;
}

function saveToggleSettings(toggles: Record<ToggleKey, boolean>) {
  localStorage.setItem(togglesStorageKey, JSON.stringify(toggles));
}

function formatJoinedSince(joinedAt: string) {
  if (!joinedAt) {
    return "Not available";
  }

  const date = new Date(joinedAt);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-SG", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getResolvedTheme(mode: FormState["theme"]) {
  if (mode === "dark" || mode === "light") {
    return mode;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): FormState["theme"] {
  if (typeof window === "undefined") {
    return "system";
  }

  const storedTheme = localStorage.getItem(themeStorageKey);

  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return "system";
}

function applyTheme(theme: FormState["theme"]) {
  const storedTheme = theme === "system" ? "auto" : theme;

  localStorage.setItem(themeStorageKey, storedTheme);
  document.documentElement.dataset.theme = getResolvedTheme(theme);
  window.dispatchEvent(new Event(themeModeChangedEventName));
}

function createCompressedAvatarDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, avatarMaxSize / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Unable to process avatar image."));
        return;
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);

      resolve(canvas.toDataURL("image/webp", avatarImageQuality));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read avatar image."));
    };

    image.src = objectUrl;
  });
}

function getInitials(name: string, email: string) {
  const source = name || email || "DR";
  const words = source.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : source.slice(0, 2)).toUpperCase();
}

function Icon({ name }: { name: "upload" | "shield" | "clock" | "activity" | "download" }) {
  const paths = {
    upload: (
      <>
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M20 16v4H4v-4" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    activity: (
      <>
        <path d="M22 12h-4l-3 8-6-16-3 8H2" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
    >
      {paths[name]}
    </svg>
  );
}

function ThemeModeIcon({ theme }: { theme: SettingsTheme }) {
  if (theme === "light") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    );
  }

  if (theme === "dark") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="M12 3a6.36 6.36 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <rect width="18" height="12" x="3" y="4" rx="2" />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
    </svg>
  );
}

export default function SettingsClient({ user, initialSettings }: SettingsClientProps) {
  const initialForm = useMemo(() => createInitialForm(user, initialSettings), [user, initialSettings]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [savedProfile, setSavedProfile] = useState<ProfileSnapshot>(() => createProfileSnapshot(initialForm));
  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>(() => createInitialToggles(initialSettings));
  const [modalAction, setModalAction] = useState<DangerAction | null>(null);
  const [profileSaveStatus, setProfileSaveStatus] = useState<SaveStatus>({ state: "idle", message: "" });
  const [themeSaveStatus, setThemeSaveStatus] = useState<SaveStatus>({ state: "idle", message: "" });
  const [toggleSaveStatus, setToggleSaveStatus] = useState<SaveStatus>({ state: "idle", message: "" });
  const [pendingToggleKey, setPendingToggleKey] = useState<ToggleKey | null>(null);

  const initials = getInitials(form.userName, form.email);
  const modal = modalAction ? dangerContent[modalAction] : null;
  const joinedSince = useMemo(() => formatJoinedSince(user.joinedAt), [user.joinedAt]);
  const currentProfile = createProfileSnapshot(form);
  const profileIsDirty = !isSameProfileSnapshot(currentProfile, savedProfile);
  const usernameIsTooShort = form.userName.trim().length < profileUserNameMinLength;

  function updateForm<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveProfile() {
    const nextProfile = createProfileSnapshot(form);
    const nextUserName = nextProfile.userName.trim();
    const usernameChanged = nextUserName !== savedProfile.userName;
    const profilePatchWithoutUserName: Partial<ProfileSnapshot> = {};

    if (nextProfile.avatarUrl && nextProfile.avatarUrl.length > avatarDataUrlLimit) {
      setProfileSaveStatus({
        state: "error",
        message: "Profile picture is too large. Upload it again so it can be resized before saving.",
      });
      return;
    }

    if (nextProfile.avatarUrl !== savedProfile.avatarUrl) {
      profilePatchWithoutUserName.avatarUrl = nextProfile.avatarUrl;
    }

    if (nextProfile.bio !== savedProfile.bio) {
      profilePatchWithoutUserName.bio = nextProfile.bio;
    }

    if (usernameChanged && nextUserName.length < profileUserNameMinLength) {
      if (Object.keys(profilePatchWithoutUserName).length === 0) {
        setProfileSaveStatus({
          state: "error",
          message: `Username must be at least ${profileUserNameMinLength} characters long.`,
        });
        return;
      }
    }

    setProfileSaveStatus({ state: "pending", message: "Saving profile..." });

    let savedSnapshot = savedProfile;

    if (Object.keys(profilePatchWithoutUserName).length > 0) {
      const result = await saveAccountSettingsAction({ profile: profilePatchWithoutUserName });

      if (!result.ok || !result.settings) {
        setProfileSaveStatus({ state: "error", message: result.message });
        return;
      }

      savedSnapshot = {
        ...savedSnapshot,
        avatarUrl: result.settings.profile.avatarUrl,
        bio: result.settings.profile.bio,
      };
    }

    if (usernameChanged && nextUserName.length < profileUserNameMinLength) {
      setForm((current) => ({
        ...current,
        avatarUrl: savedSnapshot.avatarUrl,
        bio: savedSnapshot.bio,
      }));
      setSavedProfile(savedSnapshot);
      localStorage.setItem(profileSettingsStorageKey, JSON.stringify(savedSnapshot));
      window.dispatchEvent(new Event(profileSettingsChangedEventName));
      setProfileSaveStatus({
        state: "error",
        message: `Profile saved, but username must be at least ${profileUserNameMinLength} characters long.`,
      });
      return;
    }

    if (usernameChanged) {
      const result = await saveAccountSettingsAction({ profile: { userName: nextUserName } });

      if (!result.ok || !result.settings) {
        setForm((current) => ({
          ...current,
          avatarUrl: savedSnapshot.avatarUrl,
          bio: savedSnapshot.bio,
        }));
        setSavedProfile(savedSnapshot);
        localStorage.setItem(profileSettingsStorageKey, JSON.stringify(savedSnapshot));
        window.dispatchEvent(new Event(profileSettingsChangedEventName));
        setProfileSaveStatus({
          state: "error",
          message: savedSnapshot === savedProfile ? result.message : `Profile saved, but ${result.message.toLowerCase()}`,
        });
        return;
      }

      savedSnapshot = {
        ...savedSnapshot,
        userName: result.settings.profile.userName,
      };
    }

    setForm((current) => ({
      ...current,
      avatarUrl: savedSnapshot.avatarUrl,
      userName: savedSnapshot.userName,
      bio: savedSnapshot.bio,
    }));
    setSavedProfile(savedSnapshot);
    localStorage.setItem(profileSettingsStorageKey, JSON.stringify(savedSnapshot));
    window.dispatchEvent(new Event(profileSettingsChangedEventName));
    setProfileSaveStatus({ state: "success", message: "Profile saved." });
  }

  async function updateToggle(key: ToggleKey, enabled: boolean) {
    const previousToggles = toggles;
    const nextToggles = { ...toggles, [key]: enabled };

    setToggles(nextToggles);
    setPendingToggleKey(key);
    setToggleSaveStatus({ state: "pending", message: "Saving preferences..." });
    const result = await saveAccountSettingsAction({ toggles: nextToggles });
    setPendingToggleKey(null);

    if (!result.ok || !result.settings) {
      setToggles(previousToggles);
      setToggleSaveStatus({ state: "error", message: result.message });
      return;
    }

    setToggles(result.settings.toggles);
    saveToggleSettings(result.settings.toggles);
    setToggleSaveStatus({ state: "success", message: "Preferences saved." });
  }

  async function handleAvatarFiles(files: FileList | null) {
    const file = files?.[0];

    if (file) {
      try {
        const avatarUrl = await createCompressedAvatarDataUrl(file);

        updateForm("avatarUrl", avatarUrl);
      } catch (error) {
        console.error(error);
      }
    }
  }

  useEffect(() => {
    const syncThemeFromStorage = () => {
      setForm((current) => ({ ...current, theme: getStoredTheme() }));
    };

    applyTheme(initialForm.theme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      if (getStoredTheme() === "system") {
        document.documentElement.dataset.theme = getResolvedTheme("system");
      }
    };

    window.addEventListener("storage", syncThemeFromStorage);
    window.addEventListener(themeModeChangedEventName, syncThemeFromStorage);
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      window.removeEventListener("storage", syncThemeFromStorage);
      window.removeEventListener(themeModeChangedEventName, syncThemeFromStorage);
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [initialForm.theme]);

  async function handleThemeChange(theme: FormState["theme"]) {
    const previousTheme = form.theme;

    updateForm("theme", theme);
    applyTheme(theme);
    setThemeSaveStatus({ state: "pending", message: "Saving appearance..." });
    const result = await saveAccountSettingsAction({ theme });

    if (!result.ok || !result.settings) {
      updateForm("theme", previousTheme);
      applyTheme(previousTheme);
      setThemeSaveStatus({ state: "error", message: result.message });
      return;
    }

    updateForm("theme", result.settings.theme);
    applyTheme(result.settings.theme);
    setThemeSaveStatus({ state: "success", message: "Appearance saved." });
  }

  return (
    <main className="home-page min-h-screen text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 py-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Account Settings
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Manage your account, security, and notifications.
            </p>
          </div>
        </header>

        <div className="mt-6 space-y-6">
            <section id="profile" className="scroll-mt-28 py-3">
              <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-slate-950">
                    Profile
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                    Manage your personal information and how others see you on Deal Rakyat.
                  </p>
                </div>

                <div className="settings-profile-fields-card grid w-full gap-6 rounded-2xl border border-slate-200 bg-white/60 p-5 shadow-sm sm:p-6 lg:grid-cols-[190px_minmax(0,1fr)]">
                  <div className="flex flex-col items-center text-center">
                    <p className="text-sm font-black text-slate-950">Profile Picture</p>
                    <div className="mt-6 flex flex-col items-center">
                      <div className="relative">
                        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-[#ff1b72] text-3xl font-black text-white shadow-sm">
                          {form.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={form.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            initials
                          )}
                        </div>
                        <label className="absolute bottom-1 right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-white shadow-sm transition hover:bg-[#dc115e]">
                          <span className="sr-only">Change profile picture</span>
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          >
                            <path d="M14.5 4h-5L8 6H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3l-1.5-2Z" />
                            <circle cx="12" cy="13" r="3" />
                          </svg>
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(event) => handleAvatarFiles(event.target.files)}
                          />
                        </label>
                      </div>
                      <label className="settings-secondary-action mt-5 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-300 bg-transparent px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-950">
                        <Icon name="upload" />
                        Upload New
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(event) => handleAvatarFiles(event.target.files)}
                        />
                      </label>
                      <p className="mt-3 text-xs leading-5 text-slate-500">JPG, PNG or GIF. Max 5MB.</p>
                    </div>
                  </div>

                  <div className="grid w-full max-w-2xl gap-5">
                    <div className="space-y-2">
                      <TextInput
                        label="Username"
                        size="compact"
                        value={form.userName}
                        minLength={profileUserNameMinLength}
                        showEditIcon
                        onChange={(value) => updateForm("userName", value)}
                      />
                      {usernameIsTooShort ? (
                        <p className="text-xs font-semibold text-rose-600">
                          Minimum {profileUserNameMinLength} characters.
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <TextInput label="Bio" size="compact" value={form.bio} maxLength={profileBioLimit} showEditIcon onChange={(value) => updateForm("bio", value)} />
                      <p className="text-right text-xs font-semibold text-slate-500">
                        {form.bio.length} / {profileBioLimit}
                      </p>
                    </div>
                    <StaticField label="Email Address" value={form.email} />
                    <StaticField label="Joined Since" value={joinedSince} />
                    {profileIsDirty ? (
                      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <SmallButton
                          disabled={profileSaveStatus.state === "pending"}
                          onClick={() => {
                            setForm((current) => ({
                              ...current,
                              ...savedProfile,
                            }));
                          }}
                        >
                          Discard Changes
                        </SmallButton>
                        <SmallButton
                          variant="primary"
                          disabled={profileSaveStatus.state === "pending"}
                          onClick={saveProfile}
                        >
                          {profileSaveStatus.state === "pending" ? "Saving..." : "Save Settings"}
                        </SmallButton>
                      </div>
                    ) : null}
                    {profileSaveStatus.message ? (
                      <p
                        className={`text-right text-xs font-semibold ${
                          profileSaveStatus.state === "error" ? "text-rose-600" : "text-emerald-700"
                        }`}
                        aria-live="polite"
                      >
                        {profileSaveStatus.message}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section id="appearance" className="settings-section-divider scroll-mt-28 py-8">
              <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-slate-950">
                    Appearance
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                    Pick the display mode that feels easiest to read.
                  </p>
                </div>

                <div className="py-4">
                  <p className="text-sm font-bold text-slate-950">Theme</p>
                  <div className="mt-3 grid w-full max-w-xl gap-3 sm:grid-cols-3">
                    {(["light", "dark", "system"] as const).map((theme) => {
                      const label = theme === "system" ? "System" : theme[0].toUpperCase() + theme.slice(1);
                      const isSelected = form.theme === theme;

                      return (
                        <button
                          key={theme}
                          type="button"
                          aria-label={`Use ${label.toLowerCase()} appearance`}
                          aria-pressed={isSelected}
                          title={label}
                          disabled={themeSaveStatus.state === "pending"}
                          onClick={() => handleThemeChange(theme)}
                          className={`inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-md border px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 ${
                            isSelected
                              ? "border-[#dc115e] bg-[#dc115e] text-white shadow-sm"
                              : "appearance-mode-option border-slate-200 bg-transparent"
                          }`}
                        >
                          <ThemeModeIcon theme={theme} />
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {themeSaveStatus.message ? (
                    <p
                      className={`mt-3 text-xs font-semibold ${
                        themeSaveStatus.state === "error" ? "text-rose-600" : "text-emerald-700"
                      }`}
                      aria-live="polite"
                    >
                      {themeSaveStatus.message}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <section id="notifications" className="settings-section-divider scroll-mt-28 py-8">
              <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-slate-950">
                    Notifications
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                    Choose which account and community updates should reach you.
                  </p>
                </div>

                <div>
                  {notificationToggles.map((item) => (
                    <NotificationToggle
                      key={item.key}
                      enabled={toggles[item.key]}
                      label={item.label}
                      description={item.description}
                      disabled={pendingToggleKey === item.key}
                      onChange={(enabled) => updateToggle(item.key, enabled)}
                    />
                  ))}
                  {toggleSaveStatus.message ? (
                    <p
                      className={`pt-2 text-xs font-semibold ${
                        toggleSaveStatus.state === "error" ? "text-rose-600" : "text-emerald-700"
                      }`}
                      aria-live="polite"
                    >
                      {toggleSaveStatus.message}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <section id="privacy" className="settings-section-divider scroll-mt-28 py-8">
              <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-slate-950">
                    Privacy
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                    Decide what profile activity is visible to other members.
                  </p>
                </div>

                <div>
                  {privacyToggles.map((item) => (
                    <NotificationToggle
                      key={item.key}
                      enabled={toggles[item.key]}
                      label={item.label}
                      description={item.description}
                      disabled={pendingToggleKey === item.key}
                      onChange={(enabled) => updateToggle(item.key, enabled)}
                    />
                  ))}
                  {toggleSaveStatus.message ? (
                    <p
                      className={`pt-2 text-xs font-semibold ${
                        toggleSaveStatus.state === "error" ? "text-rose-600" : "text-emerald-700"
                      }`}
                      aria-live="polite"
                    >
                      {toggleSaveStatus.message}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <section id="security" className="settings-section-divider scroll-mt-28 py-8">
              <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-slate-950">
                    Security
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                    Manage sign-in details and protect your account access.
                  </p>
                </div>

                <div className="grid gap-1 py-2">
                  <div className="flex flex-col gap-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-950">Password</p>
                      <p className="mt-1 text-sm text-slate-500">Last changed June 2, 2026</p>
                    </div>
                    <div className="sm:shrink-0">
                      <SmallButton>Change Password</SmallButton>
                    </div>
                  </div>

                  {[
                    {
                      action: "deactivate" as const,
                      title: "Deactivate Account",
                      description: "Temporarily suspend your profile and hide public activity.",
                    },
                    {
                      action: "delete" as const,
                      title: "Delete Account",
                      description: "Permanently delete your account and personal profile data.",
                    },
                  ].map((item) => (
                    <div key={item.action} className="flex flex-col gap-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-rose-950">{item.title}</p>
                        <p className="mt-1 text-sm text-rose-700">{item.description}</p>
                      </div>
                      <div className="sm:shrink-0">
                        <SmallButton variant="danger" onClick={() => setModalAction(item.action)}>
                          {item.action === "deactivate" ? "Deactivate" : "Delete"}
                        </SmallButton>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

        </div>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="danger-modal-title" className="settings-modal w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-5 shadow-2xl">
            <h2 id="danger-modal-title" className="text-xl font-black tracking-tight text-slate-950">
              {modal.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{modal.description}</p>
            <div className="settings-danger-note mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
              Confirmation is required before this action can continue.
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <SmallButton onClick={() => setModalAction(null)}>Cancel</SmallButton>
              <SmallButton
                variant="danger"
                onClick={() => {
                  setModalAction(null);
                }}
              >
                {modal.confirm}
              </SmallButton>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
