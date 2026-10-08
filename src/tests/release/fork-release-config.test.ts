import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepositoryFile(relativePath: string) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

describe("fork release configuration contract", () => {
  test("points updater clients at the DailenG release and trusts its key", () => {
    const overlay = JSON.parse(readRepositoryFile("src-tauri/tauri.fork.conf.json"));
    const baseConfig = JSON.parse(readRepositoryFile("src-tauri/tauri.conf.json"));

    expect(overlay.plugins.updater.endpoints).toEqual([
      "https://github.com/DailenG/skilldock/releases/latest/download/latest.json",
    ]);
    expect(overlay.plugins.updater.pubkey).toBe(
      "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEJGNTAxNTgzRjc5ODA5N0UKUldSK0NaajNneFZRdjA3NTZhMDJxcmRGbzhjVWM2cEowaVlVQmJMcDdHU1piT3VuV3hmVzlFTXIK",
    );
    expect(overlay.plugins.updater.pubkey).not.toBe(baseConfig.plugins.updater.pubkey);
  });

  test("limits the fork release workflow to manual Windows builds", () => {
    const workflow = readRepositoryFile(".github/workflows/release-fork.yml");
    const triggers = workflow.slice(workflow.indexOf("\non:\n"), workflow.indexOf("\npermissions:"));

    expect(triggers).toContain("workflow_dispatch:");
    expect(triggers).not.toMatch(/^\s+release:\s*$/m);
    expect(workflow).toContain("runs-on: windows-latest");
    expect(workflow).not.toContain("wanghuan9");
    expect(workflow).toContain("git ls-remote --exit-code --tags origin");

    const windowsConfigIndex = workflow.indexOf("--config src-tauri/tauri.windows.conf.json");
    const forkConfigIndex = workflow.indexOf("--config src-tauri/tauri.fork.conf.json");
    expect(windowsConfigIndex).toBeGreaterThanOrEqual(0);
    expect(forkConfigIndex).toBeGreaterThan(windowsConfigIndex);
  });
});
