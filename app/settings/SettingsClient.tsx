"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { changePasswordAction, saveAccountSettingsAction } from "./actions";
import {
  AccountSettings,
  SettingsTheme,
  ToggleKey,
  displayNameLimit,
  profileBioLimit,
  profileSettingsChangedEventName,
  profileSettingsStorageKey,
  togglesStorageKey,
} from "@/lib/accountSettings";
import { formatUserHandle, normalizeUserHandle } from "@/lib/userHandles";
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
  displayName: string;
  userName: string;
  bio: string;
  email: string;
  theme: SettingsTheme;
};

type ProfileSnapshot = Pick<FormState, "avatarUrl" | "displayName" | "userName" | "bio">;
type SaveStatus = {
  state: "idle" | "pending" | "success" | "error";
  message: string;
};
type PasswordField = "currentPassword" | "password" | "passwordConfirmation" | "form";
type PasswordInputField = Exclude<PasswordField, "form">;

const avatarMaxSize = 320;
const avatarMaxFileBytes = 5 * 1024 * 1024;
const avatarDataUrlLimit = 450_000;
const avatarImageQuality = 0.82;
const themeStorageKey = "dealmy_theme";
const themeModeChangedEventName = "dealmy:theme-mode-changed";

const notificationToggles: { key: ToggleKey; label: string; description: string; available?: boolean }[] = [
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
    label: "Weekly summary — unavailable",
    description: "Email summaries stay off until delivery, consent, and unsubscribe controls are configured.",
    available: false,
  },
  {
    key: "marketingEmails",
    label: "Marketing emails — unavailable",
    description: "Marketing email stays off until delivery, consent, and unsubscribe controls are configured.",
    available: false,
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
    key: "showComments",
    label: "Comment Visibility",
    description: "Let visitors browse comments you have posted.",
  },
  {
    key: "allowFollowers",
    label: "Allow Followers",
    description: "Let members follow your future deal submissions.",
  },
];

function createInitialForm(user: SettingsUser, settings: AccountSettings): FormState {
  return {
    avatarUrl: settings.profile.avatarUrl,
    displayName: settings.profile.displayName || user.displayName,
    userName: settings.profile.userName || user.displayName,
    bio: settings.profile.bio,
    email: user.email,
    theme: settings.theme,
  };
}

function createProfileSnapshot(form: FormState): ProfileSnapshot {
  return {
    avatarUrl: form.avatarUrl,
    displayName: form.displayName,
    userName: form.userName,
    bio: form.bio,
  };
}

function isSameProfileSnapshot(left: ProfileSnapshot, right: ProfileSnapshot) {
  return (
    left.avatarUrl === right.avatarUrl &&
    left.displayName === right.displayName &&
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
  const source = (name || email || "DR").replace(/^@+/, "");
  const words = source.split(/[\s._-]+/).filter(Boolean);
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

function PasswordVisibilityIcon({ visible }: { visible: boolean }) {
  return visible ? (
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
      <path d="m2 2 20 20" />
      <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
      <path d="M9.88 4.24A10.8 10.8 0 0 1 12 4c5 0 9 4 10 8a11.8 11.8 0 0 1-2.39 4.36" />
      <path d="M6.61 6.61A11.8 11.8 0 0 0 2 12c1 4 5 8 10 8a10.9 10.9 0 0 0 5.39-1.39" />
    </svg>
  ) : (
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
      <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
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
  const [profileSaveStatus, setProfileSaveStatus] = useState<SaveStatus>({ state: "idle", message: "" });
  const [themeSaveStatus, setThemeSaveStatus] = useState<SaveStatus>({ state: "idle", message: "" });
  const [toggleSaveStatus, setToggleSaveStatus] = useState<SaveStatus>({ state: "idle", message: "" });
  const [pendingToggleKey, setPendingToggleKey] = useState<ToggleKey | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    password: "",
    passwordConfirmation: "",
  });
  const [visiblePasswordFields, setVisiblePasswordFields] = useState<Record<PasswordInputField, boolean>>({
    currentPassword: false,
    password: false,
    passwordConfirmation: false,
  });
  const [passwordStatus, setPasswordStatus] = useState<SaveStatus & { field?: PasswordField }>({
    state: "idle",
    message: "",
  });

  const initials = getInitials(form.displayName, form.email);
  const joinedSince = useMemo(() => formatJoinedSince(user.joinedAt), [user.joinedAt]);
  const currentProfile = createProfileSnapshot(form);
  const profileIsDirty = !isSameProfileSnapshot(currentProfile, savedProfile);
  const normalizedHandle = normalizeUserHandle(form.userName);

  function updateForm<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveProfile() {
    const nextProfile = createProfileSnapshot(form);
    const profilePatch: Partial<ProfileSnapshot> = {};

    if (nextProfile.avatarUrl && nextProfile.avatarUrl.length > avatarDataUrlLimit) {
      setProfileSaveStatus({
        state: "error",
        message: "Profile picture is too large. Upload it again so it can be resized before saving.",
      });
      return;
    }

    if (nextProfile.avatarUrl !== savedProfile.avatarUrl) {
      profilePatch.avatarUrl = nextProfile.avatarUrl;
    }

    if (nextProfile.displayName.trim() !== savedProfile.displayName) {
      profilePatch.displayName = nextProfile.displayName.trim();
    }

    if (nextProfile.bio !== savedProfile.bio) {
      profilePatch.bio = nextProfile.bio;
    }

    setProfileSaveStatus({ state: "pending", message: "Saving profile…" });

    let savedSnapshot = savedProfile;

    if (Object.keys(profilePatch).length > 0) {
      const result = await saveAccountSettingsAction({ profile: profilePatch });

      if (!result.ok || !result.settings) {
        setProfileSaveStatus({ state: "error", message: result.message });
        return;
      }

      savedSnapshot = {
        ...savedSnapshot,
        avatarUrl: result.settings.profile.avatarUrl,
        displayName: result.settings.profile.displayName,
        userName: result.settings.profile.userName,
        bio: result.settings.profile.bio,
      };
    }

    setForm((current) => ({
      ...current,
      avatarUrl: savedSnapshot.avatarUrl,
      displayName: savedSnapshot.displayName,
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
    setToggleSaveStatus({ state: "pending", message: "Saving preferences…" });
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
      if (!file.type.startsWith("image/")) {
        setProfileSaveStatus({ state: "error", message: "Choose a JPG, PNG, GIF, or other image file." });
        return;
      }

      if (file.size > avatarMaxFileBytes) {
        setProfileSaveStatus({ state: "error", message: "Profile picture must be 5 MB or smaller." });
        return;
      }

      try {
        const avatarUrl = await createCompressedAvatarDataUrl(file);

        updateForm("avatarUrl", avatarUrl);
        setProfileSaveStatus({ state: "idle", message: "" });
      } catch {
        setProfileSaveStatus({ state: "error", message: "Could not process that image. Try a different file." });
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
    setThemeSaveStatus({ state: "pending", message: "Saving appearance…" });
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

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordStatus({ state: "pending", message: "Changing password…" });
    const result = await changePasswordAction(passwordForm);

    if (!result.ok) {
      setPasswordStatus({ state: "error", field: result.field, message: result.message });
      return;
    }

    setPasswordForm({ currentPassword: "", password: "", passwordConfirmation: "" });
    setVisiblePasswordFields({
      currentPassword: false,
      password: false,
      passwordConfirmation: false,
    });
    setPasswordStatus({ state: "success", message: result.message });
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
                            <img src={form.avatarUrl} alt="" width={112} height={112} className="h-full w-full object-cover" />
                          ) : (
                            initials
                          )}
                        </div>
                        <label className="absolute bottom-1 right-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-white shadow-sm transition hover:bg-[#dc115e]">
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
                      {form.avatarUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            updateForm("avatarUrl", "");
                            setProfileSaveStatus({ state: "idle", message: "" });
                          }}
                          className="mt-2 inline-flex min-h-10 items-center justify-center rounded-md border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/15"
                        >
                          Remove picture
                        </button>
                      ) : null}
                      <p className="mt-3 text-xs leading-5 text-slate-500">JPG, PNG or GIF. Max 5MB.</p>
                    </div>
                  </div>

                  <div className="grid w-full max-w-2xl gap-5">
                    <div className="space-y-2">
                      <TextInput
                        label="Display Name"
                        size="compact"
                        value={form.displayName}
                        maxLength={displayNameLimit}
                        showEditIcon
                        onChange={(value) => updateForm("displayName", value)}
                      />
                      <p className="text-xs font-semibold text-slate-500">
                        This is the name shown on your profile, posts, and comments.
                      </p>
                    </div>
                    <StaticField label="Username" value={normalizedHandle ? formatUserHandle(normalizedHandle) : "Not set"} />
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
                          {profileSaveStatus.state === "pending" ? "Saving…" : "Save Settings"}
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
                  <div className="mb-2 flex justify-end">
                    <Link
                      href="/notifications"
                      className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15"
                    >
                      Open notification inbox
                    </Link>
                  </div>
                  {notificationToggles.map((item) => (
                    <NotificationToggle
                      key={item.key}
                      enabled={item.available === false ? false : toggles[item.key]}
                      label={item.label}
                      description={item.description}
                      disabled={pendingToggleKey !== null || item.available === false}
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
                      disabled={pendingToggleKey !== null}
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
                  <form className="grid max-w-xl gap-4 py-2.5" onSubmit={handlePasswordChange} noValidate>
                    <div>
                      <p className="text-sm font-black text-slate-950">Change password</p>
                      <p className="mt-1 text-sm leading-5 text-slate-500">
                        Use at least 8 characters with a number and symbol. Forgotten-password recovery remains unavailable until email delivery is configured.
                      </p>
                    </div>
                    {([
                      ["currentPassword", "Current password", "current-password"],
                      ["password", "New password", "new-password"],
                      ["passwordConfirmation", "Confirm new password", "new-password"],
                    ] as const).map(([field, label, autoComplete]) => {
                      const error = passwordStatus.state === "error" && passwordStatus.field === field
                        ? passwordStatus.message
                        : "";
                      const errorId = `${field}-error`;
                      const inputId = `security-${field}`;
                      const passwordIsVisible = visiblePasswordFields[field];
                      const visibilityLabel = `${passwordIsVisible ? "Hide" : "Show"} ${label.toLowerCase()}`;

                      return (
                        <div key={field} className="grid gap-2 text-sm font-bold text-slate-950">
                          <label htmlFor={inputId}>{label}</label>
                          <span className="relative block">
                            <input
                              id={inputId}
                              type={passwordIsVisible ? "text" : "password"}
                              name={field}
                              value={passwordForm[field]}
                              autoComplete={autoComplete}
                              aria-invalid={Boolean(error)}
                              aria-describedby={error ? errorId : undefined}
                              disabled={passwordStatus.state === "pending"}
                              onChange={(event) => {
                                setPasswordForm((current) => ({ ...current, [field]: event.target.value }));
                                if (passwordStatus.state === "error") setPasswordStatus({ state: "idle", message: "" });
                              }}
                              className="post-form-field min-h-11 w-full rounded-md border border-slate-200 px-4 pr-12 text-sm font-normal text-slate-950 outline-none transition focus-visible:border-[#dc115e] focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                            <button
                              type="button"
                              title={visibilityLabel}
                              aria-label={visibilityLabel}
                              aria-pressed={passwordIsVisible}
                              disabled={passwordStatus.state === "pending"}
                              onClick={() => {
                                setVisiblePasswordFields((current) => ({
                                  ...current,
                                  [field]: !current[field],
                                }));
                              }}
                              className="absolute right-0.5 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <PasswordVisibilityIcon visible={passwordIsVisible} />
                            </button>
                          </span>
                          {error ? <span id={errorId} className="text-xs font-semibold text-rose-600">{error}</span> : null}
                        </div>
                      );
                    })}
                    {passwordStatus.message && (passwordStatus.field === "form" || passwordStatus.state === "success" || passwordStatus.state === "pending") ? (
                      <p
                        className={`text-sm font-semibold ${passwordStatus.state === "error" ? "text-rose-600" : passwordStatus.state === "success" ? "text-emerald-700" : "text-slate-600"}`}
                        role="status"
                      >
                        {passwordStatus.message}
                      </p>
                    ) : null}
                    <div>
                      <button
                        type="submit"
                        disabled={passwordStatus.state === "pending"}
                        className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#dc115e] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#c80f55] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {passwordStatus.state === "pending" ? "Changing…" : "Change password"}
                      </button>
                    </div>
                  </form>

                  <div className="settings-danger-note mt-2 border-t border-rose-200 py-4 text-sm leading-6 text-rose-800">
                    <p className="font-black text-rose-950">Account deactivation and deletion</p>
                    <p className="mt-1">
                      These actions are not available yet. They will appear here only when Deal Rakyat can safely complete the full first-party workflow.
                    </p>
                  </div>
                </div>
              </div>
            </section>

        </div>
      </div>

    </main>
  );
}
