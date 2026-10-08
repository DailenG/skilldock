import { localizeBackendText } from "@/app/backend-i18n/localize";
import { expect, it } from "vitest";

it("recursively localizes nested catalog templates without sentence punctuation", () => {
  expect(localizeBackendText(
    "Git 备份命令失败: 读取文件失败: permission denied",
    "en",
  )).toBe("Git backup command failed: Failed to read file: permission denied");
});
