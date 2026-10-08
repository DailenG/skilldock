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
  it("round-trips mapped status text across repeated language switches", () => {
    const original = "已安装到本地，可继续同步到工具。";
    const summary = { ...installedSkillFixtures[0], statusText: original };
    const english = localizeSkillSummaries([summary], "en");

    expect(english[0].statusText)
      .toBe("Installed locally. You can continue syncing it to tools.");
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

  it("round-trips 600 distinct unmapped summaries through source tracking", () => {
    const originalStatuses = Array.from({ length: 600 }, (_, index) =>
      `没有对应目录项的未知状态-${index}`
    );
    const summaries = originalStatuses.map((statusText, index) => ({
      ...installedSkillFixtures[0],
      name: `status-${index}`,
      statusText,
    }));
    const english = localizeSkillSummaries(summaries, "en");
    const chinese = localizeSkillSummaries(english, "zh-CN");

    expect(english.map((summary) => summary.statusText)).toEqual(originalStatuses);
    expect(english.map((summary) => summary.statusTextSource)).toEqual(originalStatuses);
    expect(chinese.map((summary) => summary.statusText)).toEqual(originalStatuses);
    expect(chinese.map((summary) => summary.statusTextSource)).toEqual(originalStatuses);
  });

  it("uses fresh status text when its attached source is stale", () => {
    const original = "已安装到本地，可继续同步到工具。";
    const summary = {
      ...installedSkillFixtures[0],
      statusText: original,
      statusTextSource: "本地与远端一致，可直接使用。",
    };

    const english = localizeSkillSummaries([summary], "en");

    expect(english[0].statusText)
      .toBe("Installed locally. You can continue syncing it to tools.");
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
