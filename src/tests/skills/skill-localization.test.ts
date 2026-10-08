import { installedSkillFixtures } from "@/features/skills/state/skill-fixtures";
import {
  localizeSkillStatusText,
  localizeSkillSummaries,
} from "@/features/skills/utils/skill-localization";
import { describe, expect, it } from "vitest";

describe("skill status localization", () => {
  it("restores localized backend status text when switching back to Chinese", () => {
    const original = "Agent CLI Skill 已更新。";
    const english = localizeSkillStatusText(original, "en");

    expect(english).toBe("Agent CLI skill was updated.");
    expect(localizeSkillStatusText(english, "zh-CN")).toBe(original);
  });

  it("restores localized backend status text through skill summaries", () => {
    const original = "Agent CLI Skill 已更新。";
    const summary = { ...installedSkillFixtures[0], statusText: original };
    const english = localizeSkillSummaries([summary], "en");

    expect(english[0].statusText).toBe("Agent CLI skill was updated.");
    expect(localizeSkillSummaries(english, "zh-CN")[0].statusText).toBe(original);
  });

  it("leaves unknown Chinese status text unchanged", () => {
    const unknownText = "没有对应目录项的未知状态";

    expect(localizeSkillStatusText(unknownText, "zh-CN")).toBe(unknownText);
  });

  it("evicts the oldest restored status after exceeding the cache limit", () => {
    const originalStatuses = Array.from(
      { length: 501 },
      (_, index) => `设置 GitHub 凭据目录权限失败: cache-entry-${index}`,
    );
    const englishStatuses = originalStatuses.map((status) =>
      localizeSkillStatusText(status, "en")
    );

    expect(localizeSkillStatusText(englishStatuses[0], "zh-CN")).toBe(englishStatuses[0]);
    expect(localizeSkillStatusText(englishStatuses[1], "zh-CN")).toBe(originalStatuses[1]);
  });
});
