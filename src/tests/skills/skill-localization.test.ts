import {
  gitAccountFixture,
  installedSkillFixtures,
} from "@/features/skills/state/skill-fixtures";
import {
  localizeGitAccountSummary,
  localizeSkillStatusText,
  localizeSkillSummaries,
} from "@/features/skills/utils/skill-localization";
import { describe, expect, it } from "vitest";

describe("skill status localization", () => {
  it("round-trips template-matched status text across repeated language switches", () => {
    const original = "设置 GitHub 凭据目录权限失败: os error 13";
    const summary = { ...installedSkillFixtures[0], statusText: original };
    const english = localizeSkillSummaries([summary], "en");

    expect(english[0].statusText)
      .toBe("Failed to set GitHub credentials directory permissions: os error 13");
    expect(english[0].statusTextSource).toBe(original);

    const chinese = localizeSkillSummaries(english, "zh-CN");
    expect(chinese[0].statusText).toBe(original);

    const englishAgain = localizeSkillSummaries(chinese, "en");
    expect(englishAgain[0].statusText).toBe(english[0].statusText);

    const chineseAgain = localizeSkillSummaries(englishAgain, "zh-CN");
    expect(chineseAgain[0].statusText).toBe(original);
  });

  it("leaves unknown Chinese status text unchanged", () => {
    const unknownText = "没有对应目录项的未知状态";

    expect(localizeSkillStatusText(unknownText, "zh-CN")).toBe(unknownText);
  });

  it("round-trips 600 distinct template-matched summaries", () => {
    const originalStatuses = Array.from({ length: 600 }, (_, index) =>
      `设置 GitHub 凭据目录权限失败: status-${index}`
    );
    const summaries = originalStatuses.map((statusText, index) => ({
      ...installedSkillFixtures[0],
      name: `status-${index}`,
      statusText,
    }));
    const english = localizeSkillSummaries(summaries, "en");
    const chinese = localizeSkillSummaries(english, "zh-CN");

    expect(chinese.map((summary) => summary.statusText)).toEqual(originalStatuses);
    expect(chinese.map((summary) => summary.statusTextSource)).toEqual(originalStatuses);
  });

  it("uses fresh status text when its attached source is stale", () => {
    const original = "设置 GitHub 凭据目录权限失败: fresh-error";
    const summary = {
      ...installedSkillFixtures[0],
      statusText: original,
      statusTextSource: "Agent CLI Skill 已更新。",
    };

    const english = localizeSkillSummaries([summary], "en");

    expect(english[0].statusText)
      .toBe("Failed to set GitHub credentials directory permissions: fresh-error");
    expect(english[0].statusTextSource).toBe(original);
    expect(localizeSkillSummaries(english, "zh-CN")[0].statusText).toBe(original);
  });

  it("round-trips Git account status labels", () => {
    const original = gitAccountFixture.statusLabel;
    const english = localizeGitAccountSummary(gitAccountFixture, "en")!;

    expect(english.statusLabel).toBe("Connected. Ready to open PRs.");
    expect(english.statusLabelSource).toBe(original);

    const chinese = localizeGitAccountSummary(english, "zh-CN")!;
    expect(chinese.statusLabel).toBe(original);

    const englishAgain = localizeGitAccountSummary(chinese, "en")!;
    expect(englishAgain.statusLabel).toBe(english.statusLabel);

    expect(localizeGitAccountSummary(englishAgain, "zh-CN")!.statusLabel).toBe(original);
  });
});
