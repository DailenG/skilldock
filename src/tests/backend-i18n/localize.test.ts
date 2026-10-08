import extractedStrings from "@/app/backend-i18n/extracted-strings.json";
import { BACKEND_TEXT_EN } from "@/app/backend-i18n/catalog";
import { localizeBackendText, restoreBackendText } from "@/app/backend-i18n/localize";
import { invoke, listen } from "@/app/backend-i18n/tauri";
import * as tauriCore from "@tauri-apps/api/core";
import { listen as tauriListen } from "@tauri-apps/api/event";
import { localizeSkillSummaries, localizeSkillStatusText } from "@/features/skills/utils/skill-localization";
import { installedSkillFixtures } from "@/features/skills/state/skill-fixtures";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tauri-apps/api/core")>();
  return { ...actual, invoke: vi.fn() };
});
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn() }));

const CJK_PATTERN = /[\u3400-\u9fff\uff00-\uffef\u3000-\u303f]/;
const BRACE_PATTERN = /\{\{|\}\}|\{[^{}]*\}/g;

function getPlaceholders(value: string) {
  return [...value.matchAll(BRACE_PATTERN)]
    .map(([token]) => token)
    .filter((token) => {
      if (token === "{{" || token === "}}") {
        return false;
      }
      const content = token.slice(1, -1);
      return content === ""
        || /^[0-9]+$/.test(content)
        || /^:[^{}]*$/.test(content)
        || /^[A-Za-z_][A-Za-z0-9_]*(?::[^{}]*)?$/.test(content);
    })
    .sort();
}

describe("backend text localization", () => {
  beforeEach(() => {
    vi.mocked(tauriCore.invoke).mockReset();
    if (typeof window !== "undefined") {
      window.localStorage.setItem("skilldock.settings.language", "en");
    }
  });

  it("localizes exact catalog matches", () => {
    expect(localizeBackendText("GitHub API 请求受限，请稍后重试", "en"))
      .toBe("GitHub API request limit reached. Please try again later.");
  });

  it("localizes named placeholders and preserves their values", () => {
    expect(localizeBackendText("设置 GitHub 凭据目录权限失败: os error 13", "en"))
      .toBe("Failed to set GitHub credentials directory permissions: os error 13");
  });

  it("preserves skill names in named placeholders", () => {
    expect(localizeBackendText("未找到技能 已安装", "en"))
      .toBe("Skill 已安装 was not found");
  });

  it("recursively localizes nested error messages", () => {
    expect(localizeBackendText(
      "下载 ClawHub Skill 失败: 创建目录失败: 读取文件失败: os error 13",
      "en",
    )).toBe(
      "Failed to download ClawHub skill: Failed to create directory: Failed to read file: os error 13",
    );
  });

  it("recursively localizes unnamed placeholders containing full backend messages", () => {
    expect(localizeBackendText(
      "Git 备份命令失败: Agent CLI Skill 已更新。",
      "en",
    )).toBe("Git backup command failed: Agent CLI skill was updated.");
  });

  it("does not recursively localize debug placeholders", () => {
    expect(localizeBackendText(
      "skills 命令执行失败，退出码 Agent CLI Skill 已更新。",
      "en",
    )).toBe("skills command failed with exit code Agent CLI Skill 已更新。");
  });

  it("restores a localized backend status when switching back to Chinese", () => {
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

  it("returns unknown backend text unchanged when restoring", () => {
    const unknownText = "没有对应目录项的未知状态";

    expect(restoreBackendText(unknownText)).toBe(unknownText);
  });

  it("matches unnamed placeholders in order", () => {
    expect(localizeBackendText(
      "Git 备份命令失败: write denied（PermissionDenied）",
      "en",
    )).toBe("Git backup command failed: write denied (PermissionDenied)");
  });

  it("passes through unknown Chinese, Chinese-language, and ASCII text", () => {
    expect(localizeBackendText("这是未知的错误", "en")).toBe("这是未知的错误");
    expect(localizeBackendText("GitHub API 请求受限，请稍后重试", "zh-CN"))
      .toBe("GitHub API 请求受限，请稍后重试");
    expect(localizeBackendText("os error 13", "en")).toBe("os error 13");
  });

  it("keeps catalog translations English and preserves every placeholder", () => {
    const invalidEntries = Object.entries(BACKEND_TEXT_EN).filter(([key, value]) =>
      CJK_PATTERN.test(value)
      || JSON.stringify(getPlaceholders(key)) !== JSON.stringify(getPlaceholders(value))
    );

    expect(invalidEntries).toEqual([]);
  });

  it("covers every extracted backend string", () => {
    const missingStrings = extractedStrings.filter(
      (value) => !Object.prototype.hasOwnProperty.call(BACKEND_TEXT_EN, value),
    );

    expect(missingStrings).toEqual([]);
  });

  it("localizes string rejections without changing their type", async () => {
    vi.mocked(tauriCore.invoke).mockRejectedValueOnce("GitHub API 请求受限，请稍后重试");

    await expect(invoke("some_command"))
      .rejects.toBe("GitHub API request limit reached. Please try again later.");
  });

  it("localizes Error messages while preserving the Error type", async () => {
    const error = new Error("GitHub API 请求受限，请稍后重试");
    vi.mocked(tauriCore.invoke).mockRejectedValueOnce(error);

    await expect(invoke("some_command")).rejects.toBe(error);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("GitHub API request limit reached. Please try again later.");
  });

  it("localizes object rejection messages without changing the object", async () => {
    const error = { message: "GitHub API 请求受限，请稍后重试", code: "rate_limited" };
    vi.mocked(tauriCore.invoke).mockRejectedValueOnce(error);

    await expect(invoke("some_command")).rejects.toBe(error);
    expect(error).toEqual({
      message: "GitHub API request limit reached. Please try again later.",
      code: "rate_limited",
    });
  });

  it("localizes only top-level CJK string event fields", async () => {
    type Payload = {
      message: string;
      nested: { message: string };
      status: string;
    };
    let dispatch: ((event: { event: string; id: number; payload: Payload }) => void) | undefined;
    vi.mocked(tauriListen).mockImplementationOnce((_, handler) => {
      dispatch = handler as unknown as NonNullable<typeof dispatch>;
      return Promise.resolve(vi.fn());
    });
    const handler = vi.fn();

    await listen<Payload>("progress", handler);
    dispatch?.({
      event: "progress",
      id: 1,
      payload: {
        message: "读取文件失败: permission denied",
        nested: { message: "读取文件失败: permission denied" },
        status: "done",
      },
    });

    expect(handler).toHaveBeenCalledWith({
      event: "progress",
      id: 1,
      payload: {
        message: "Failed to read file: permission denied",
        nested: { message: "读取文件失败: permission denied" },
        status: "done",
      },
    });
  });
});
