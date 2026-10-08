import { localizeBackendText } from "@/app/backend-i18n/localize";
import { expect, it, vi } from "vitest";

it("recursively localizes nested catalog templates without sentence punctuation", () => {
  expect(localizeBackendText(
    "Git 备份命令失败: 读取文件失败: permission denied",
    "en",
  )).toBe("Git backup command failed: Failed to read file: permission denied");
});

it("localizes nested clone failures across lines and ASCII prefixes", () => {
  const message = [
    "无法克隆远端仓库。已先尝试 HTTP，失败后尝试 SSH，均未成功。",
    "HTTP /does/not/exist.git: 仓库克隆失败: fatal: repository not found",
    "SSH git@github.com:owner/repo.git: 仓库克隆失败: fatal: Could not read from remote repository.",
  ].join("\n");

  expect(localizeBackendText(message, "en")).toBe([
    "Could not clone the remote repository. HTTP was tried first, then SSH, but both failed.",
    "HTTP /does/not/exist.git: Repository clone failed: fatal: repository not found",
    "SSH git@github.com:owner/repo.git: Repository clone failed: fatal: Could not read from remote repository.",
  ].join("\n"));
});

it("keeps unknown CJK text unchanged without scanning every ASCII prefix", () => {
  const message = "a: b: c: d: e: f: g: h: i: j: k: l: 未知中文";
  const execSpy = vi.spyOn(RegExp.prototype, "exec");

  try {
    expect(localizeBackendText(message, "en")).toBe(message);
    expect(execSpy.mock.calls.length).toBeLessThan(5000);
  } finally {
    execSpy.mockRestore();
  }
});
