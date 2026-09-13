import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { contactSettingsApi, defaultContactSettings, type ContactSettings } from "@/api/contactSettingsApi";

interface ContactSettingsValue {
  settings: ContactSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ContactSettingsContext = createContext<ContactSettingsValue>({
  settings: defaultContactSettings,
  loading: false,
  refresh: async () => undefined,
});

export function ContactSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(defaultContactSettings);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    try {
      const result = await contactSettingsApi.public();
      setSettings({
        phones: result.phones || [],
        emails: result.emails || [],
        socialLinks: result.socialLinks || defaultContactSettings.socialLinks,
      });
    } catch {
      setSettings(defaultContactSettings);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, []);
  const value = useMemo(() => ({ settings, loading, refresh }), [settings, loading]);
  return <ContactSettingsContext.Provider value={value}>{children}</ContactSettingsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useContactSettings = () => useContext(ContactSettingsContext);

export const phoneHref = (value: string) => `tel:${value.replace(/[^\d+]/g, "")}`;
export const whatsappHref = (value: string, message?: string) => {
  const digits = value.replace(/\D/g, "");
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
};
