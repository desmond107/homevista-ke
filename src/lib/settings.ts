import "server-only";
import { prisma } from "./db";

/** System settings with their defaults. Admins edit these under Admin → Settings. */
export const SETTING_DEFAULTS = {
  unlock_price: "250",
  subscription_price: "1000",
  subscription_days: "30",
  require_listing_approval: "true",
  auto_publish_verified: "true", // verified listers skip listing approval
  review_moderation: "false", // hold new reviews for approval
  reminder_days: "5,2,1",
  site_notice: "",
};

export type SettingKey = keyof typeof SETTING_DEFAULTS;

export async function getSettings() {
  const rows = await prisma.setting.findMany();
  const map = { ...SETTING_DEFAULTS } as Record<SettingKey, string>;
  for (const r of rows) if (r.key in map) map[r.key as SettingKey] = r.value;
  return {
    unlockPrice: toInt(map.unlock_price, 250),
    subscriptionPrice: toInt(map.subscription_price, 1000),
    subscriptionDays: toInt(map.subscription_days, 30),
    requireListingApproval: map.require_listing_approval === "true",
    autoPublishVerified: map.auto_publish_verified === "true",
    reviewModeration: map.review_moderation === "true",
    reminderDays: map.reminder_days
      .split(",")
      .map((d) => parseInt(d.trim(), 10))
      .filter((d) => d > 0)
      .sort((a, b) => b - a),
    siteNotice: map.site_notice,
  };
}

export type Settings = Awaited<ReturnType<typeof getSettings>>;

function toInt(v: string, fallback: number) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function setSetting(key: SettingKey, value: string) {
  await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}
