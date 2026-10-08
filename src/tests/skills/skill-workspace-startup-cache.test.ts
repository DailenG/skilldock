import { expect, test } from "vitest";
import { installedSkillFixtures } from "@/features/skills/state/skill-fixtures";
import {
  mergeLocalGitStates,
  mergeStartupSkillStatusCache,
} from "@/features/skills/state/skill-workspace";
import type { SkillSummary } from "@/features/skills/state/skill-store";
import { localizeSkillSummaries } from "@/features/skills/utils/skill-localization";

test("keeps cached remote update markers during startup refresh", () => {
  const cachedSkill: SkillSummary = {
    ...installedSkillFixtures[1],
    statusText: "cached remote status",
    statusTextSource: "cached remote status",
  };
  const startupSkill: SkillSummary = {
    ...cachedSkill,
    collabStatus: "clean",
    statusText: "本地与远端一致，可直接使用。",
    statusTextSource: "stale startup status",
    lastCheckedAt: "未检查",
  };

  const [mergedSkill] = mergeStartupSkillStatusCache([startupSkill], [cachedSkill]);

  expect(mergedSkill.collabStatus).toBe("update-available");
  expect(mergedSkill.statusText).toBe(cachedSkill.statusText);
  expect(mergedSkill.statusTextSource).toBe(cachedSkill.statusTextSource);
  expect(mergedSkill.lastCheckedAt).toBe(cachedSkill.lastCheckedAt);
});

test("keeps refreshed status source when merging local Git state", () => {
  const currentStatus = localizeSkillSummaries([{
    ...installedSkillFixtures[0],
    statusText: "Agent CLI Skill 已更新。",
  }], "en")[0];
  const refreshedStatusText = "设置 GitHub 凭据目录权限失败: os error 13";
  const refreshedStatus = localizeSkillSummaries([{
    ...installedSkillFixtures[0],
    statusText: refreshedStatusText,
  }], "en")[0];

  const [mergedSkill] = mergeLocalGitStates([currentStatus], [refreshedStatus]);

  expect(mergedSkill.statusText)
    .toBe("Failed to set GitHub credentials directory permissions: os error 13");
  expect(mergedSkill.statusTextSource).toBe(refreshedStatusText);
  expect(localizeSkillSummaries([mergedSkill], "zh-CN")[0].statusText)
    .toBe(refreshedStatusText);
});

test("does not restore stale cached pending push markers over a clean startup skill", () => {
  const cachedSkill = installedSkillFixtures[0];
  const startupSkill: SkillSummary = {
    ...cachedSkill,
    collabStatus: "clean",
    statusText: "本地与远端一致，可直接使用。",
    lastCheckedAt: "未检查",
  };

  const [mergedSkill] = mergeStartupSkillStatusCache([startupSkill], [cachedSkill]);

  expect(mergedSkill.collabStatus).toBe("clean");
  expect(mergedSkill.statusText).toBe("本地与远端一致，可直接使用。");
  expect(mergedSkill.lastCheckedAt).toBe("未检查");
});

test("does not apply cached markers to a different local path", () => {
  const cachedSkill = installedSkillFixtures[1];
  const movedSkill: SkillSummary = {
    ...cachedSkill,
    localPath: `${cachedSkill.localPath}-new`,
    collabStatus: "clean",
    statusText: "本地与远端一致，可直接使用。",
  };

  const [mergedSkill] = mergeStartupSkillStatusCache([movedSkill], [cachedSkill]);

  expect(mergedSkill.collabStatus).toBe("clean");
});
