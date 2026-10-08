import { useState, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, vi } from "vitest";
import { AppI18nProvider } from "@/app/i18n";
import { CliRoute } from "@/app/routes/cli";
import * as skillClient from "@/features/skills/api/skill-client";
import { useSkillWorkspace } from "@/features/skills/state/skill-workspace";
import type { AppLanguage } from "@/features/skills/state/skill-store";

vi.mock("@/features/skills/state/skill-workspace", () => ({
  useSkillWorkspace: vi.fn(),
}));

const mockedUseSkillWorkspace = vi.mocked(useSkillWorkspace);

function LanguageSwitcher() {
  const { setLanguage } = useSkillWorkspace();

  return (
    <button type="button" onClick={() => void setLanguage("zh-CN")}>
      Switch to Chinese
    </button>
  );
}

function LanguageHarness({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>("en");
  mockedUseSkillWorkspace.mockReturnValue({
    language,
    setLanguage: async (nextLanguage: AppLanguage) => setLanguage(nextLanguage),
  } as unknown as ReturnType<typeof useSkillWorkspace>);

  return <AppI18nProvider>{children}</AppI18nProvider>;
}

beforeEach(() => {
  vi.restoreAllMocks();
  mockedUseSkillWorkspace.mockReset();
});

test("retranslates the CLI load error after switching languages", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(skillClient, "fetchCliTools").mockRejectedValue(new Error("offline"));

  render(
    <LanguageHarness>
      <CliRoute />
      <LanguageSwitcher />
    </LanguageHarness>,
  );

  expect(
    await screen.findByText("Failed to load CLI list. Please try again."),
  ).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Switch to Chinese" }));

  expect(
    await screen.findByText("读取 CLI 列表失败，请稍后重试。"),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("Failed to load CLI list. Please try again."),
  ).not.toBeInTheDocument();
});
