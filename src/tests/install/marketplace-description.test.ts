import { describe, expect, it } from "vitest";
import { tx } from "@/app/i18n";
import {
  resolveMarketplaceDescription,
  type MarketplaceDescriptionTranslator,
} from "@/features/install/marketplace-description";

function createTranslator(language: "en" | "zh-CN"): MarketplaceDescriptionTranslator {
  return (key, values) => tx(language, key, values);
}

describe("resolveMarketplaceDescription", () => {
  it("localizes an exact generated description in English", () => {
    expect(resolveMarketplaceDescription(
      "  来自 owner/repo 的公开 skill（workflow-critic）  ",
      "workflow-critic",
      createTranslator("en"),
    )).toBe("Public skill from owner/repo (workflow-critic)");
  });

  it("preserves a generated description when its name does not match", () => {
    const description = "来自 owner/repo 的公开 skill（other-skill）";
    expect(resolveMarketplaceDescription(
      description,
      "workflow-critic",
      createTranslator("en"),
    )).toBe(description);
  });

  it("preserves arbitrary Chinese descriptions", () => {
    const description = "这是一段第三方介绍。";
    expect(resolveMarketplaceDescription(
      description,
      "workflow-critic",
      createTranslator("en"),
    )).toBe(description);
  });

  it("uses the Chinese generated-description template in zh-CN", () => {
    expect(resolveMarketplaceDescription(
      "来自 owner/repo 的公开 skill（workflow-critic）",
      "workflow-critic",
      createTranslator("zh-CN"),
    )).toBe("来自 owner/repo 的公开 skill（workflow-critic）");
  });
});
