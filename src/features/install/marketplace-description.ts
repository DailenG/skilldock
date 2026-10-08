export type MarketplaceDescriptionTranslator = (
  key: "install.market.fallbackDescription",
  values: Record<string, string | number>,
) => string;

export function resolveMarketplaceDescription(
  description: string,
  skillName: string,
  t: MarketplaceDescriptionTranslator,
) {
  const generatedDescription = /^来自 (.+) 的公开 skill（(.+)）$/.exec(description.trim());
  if (!generatedDescription || generatedDescription[2] !== skillName.trim()) {
    return description;
  }

  return t("install.market.fallbackDescription", {
    repository: generatedDescription[1],
    name: skillName,
  });
}
