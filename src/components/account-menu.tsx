import * as Menu from "@radix-ui/react-dropdown-menu";
import { Command as CommandIcon, Keyboard, Languages, LogOut, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { authEnabled, signOut } from "@/lib/auth/client";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { COPY } from "@/lib/i18n";
import { useField } from "@/stores/field";
import { usePrefs } from "@/stores/prefs";
import { useUi } from "@/stores/ui";

/** Avatar button that folds theme, language, shortcuts and sign-out into one menu. */
export function AccountMenu() {
  const user = useCurrentUser();
  const { lang, theme, setLang, setTheme } = usePrefs();
  const setPaletteOpen = useUi((s) => s.setPaletteOpen);
  const [signingOut, setSigningOut] = useState(false);
  const t = COPY[lang];
  if (!user) return null;
  const label = user.displayName ?? user.primaryEmail ?? "Account";
  const initials = label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  function doSignOut() {
    const pending = useField.getState().pending;
    if (pending > 0 && !window.confirm(`${pending} saves are still on this phone. Sign out anyway? They stay on the device.`)) return;
    setSigningOut(true);
    void signOut().catch(() => setSigningOut(false));
  }

  const item =
    "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-sm text-fg outline-none data-[highlighted]:bg-surface-2";

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className="grid size-10 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {user.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="" className="size-8 rounded-full object-cover" />
          ) : (
            <span className="qads-avatar grid size-8 place-items-center rounded-full text-[11px] font-bold tracking-tight">
              {initials || "•"}
            </span>
          )}
        </button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={6}
          className="qads-menu z-[70] min-w-56 rounded-2xl p-1.5"
        >
          <div className="px-2.5 pb-2 pt-1.5">
            <p className="truncate text-sm font-semibold">{label}</p>
            {user.primaryEmail && user.primaryEmail !== label ? (
              <p className="truncate text-xs text-muted">{user.primaryEmail}</p>
            ) : null}
          </div>
          <Menu.Separator className="my-1 h-px bg-border" />
          <Menu.Item className={item} onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="size-4 text-muted" /> : <Moon className="size-4 text-muted" />}
            {theme === "dark" ? t.light : t.dark}
          </Menu.Item>
          <Menu.Item className={item} onSelect={() => setLang(lang === "en" ? "ar" : "en")}>
            <Languages className="size-4 text-muted" />
            {lang === "en" ? "العربية" : "English"}
          </Menu.Item>
          <Menu.Item className={item} onSelect={() => setPaletteOpen(true)}>
            <CommandIcon className="size-4 text-muted" />
            <span className="flex-1">{t.search}</span>
            <kbd className="text-[10px] font-semibold text-muted">⌘K</kbd>
          </Menu.Item>
          <Menu.Item className={`${item} hidden lg:flex`} onSelect={() => setPaletteOpen(true)}>
            <Keyboard className="size-4 text-muted" />
            <span className="flex-1">{t.shortcuts}</span>
            <kbd className="text-[10px] font-semibold text-muted">G · M D R O</kbd>
          </Menu.Item>
          {authEnabled ? (
            <>
              <Menu.Separator className="my-1 h-px bg-border" />
              <Menu.Item className={`${item} text-danger`} disabled={signingOut} onSelect={(e) => { e.preventDefault(); doSignOut(); }}>
                <LogOut className="size-4" />
                {signingOut ? "Signing out…" : "Sign out"}
              </Menu.Item>
            </>
          ) : null}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
