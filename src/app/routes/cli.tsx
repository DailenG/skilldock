import { useEffect, useState } from "react";
import { useTranslate } from "@/app/i18n";
import { fetchCliTools } from "@/features/skills/api/skill-client";
import {
  ToolListPageShell,
  ToolListRow,
  useSingleExpandedRow,
} from "@/features/skills/components/ToolListRows";
import type { CliToolSummary } from "@/features/skills/state/skill-store";

function ImportIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 4.167v7.5m0 0 3.333-3.333M10 11.667 6.667 8.334M4.167 15h11.666"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CliRoute() {
  const { t } = useTranslate();
  const [cliTools, setCliTools] = useState<CliToolSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const { expandedId, handleExpandedChange } = useSingleExpandedRow();

  async function loadCliTools(options?: { silent?: boolean }) {
    const isSilent = options?.silent ?? false;
    if (isSilent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const nextCliTools = await fetchCliTools();
      setCliTools(nextCliTools);
      setHasLoadError(false);
    } catch (error) {
      console.warn("Failed to load CLI tools", error);
      setHasLoadError(true);
    } finally {
      if (isSilent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    let shouldIgnore = false;

    void (async () => {
      try {
        const nextCliTools = await fetchCliTools();
        if (!shouldIgnore) {
          setCliTools(nextCliTools);
          setHasLoadError(false);
        }
      } catch (error) {
        console.warn("Failed to load CLI tools", error);
        if (!shouldIgnore) {
          setHasLoadError(true);
        }
      } finally {
        if (!shouldIgnore) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      shouldIgnore = true;
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredCliTools = cliTools.filter((cliTool) => {
    if (!normalizedQuery) {
      return true;
    }

    const searchContent = [
      cliTool.name,
      cliTool.command,
      cliTool.description,
      cliTool.executablePath,
      cliTool.updateCommand,
      ...cliTool.bundledSkills,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchContent.includes(normalizedQuery);
  });

  return (
    <ToolListPageShell
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      emptyTitle={t("cli.empty.title")}
      emptyDescription={t("cli.empty.description")}
      errorMessage={hasLoadError ? t("cli.error.load") : ""}
      itemsCount={filteredCliTools.length}
      loadingText={t("cli.loading")}
      refreshLabel={t("cli.refresh")}
      refreshBusyLabel={t("cli.refreshing")}
      toolbarAriaLabel={t("cli.toolbar.aria")}
      searchValue={query}
      searchPlaceholder={t("cli.search.placeholder")}
      searchAriaLabel={t("cli.search.aria")}
      onRefresh={() => loadCliTools({ silent: true })}
      onSearchChange={setQuery}
      toolbarSlotId="tool-list-header-toolbar-slot"
      toolbarActions={(
        <button
          className="secondary-button secondary-button--compact skills-toolbar-button"
          type="button"
          disabled
        >
          <span aria-hidden="true" className="skills-toolbar-button__icon">
            <ImportIcon />
          </span>
          <span>{t("cli.scanImport")}</span>
        </button>
      )}
    >
      {filteredCliTools.map((cliTool) => (
        <ToolListRow
          key={cliTool.id}
          rowId={cliTool.id}
          name={cliTool.name}
          subtitle={`${cliTool.description || cliTool.command}${cliTool.bundledSkills.length > 0 ? ` · ${t("cli.row.boundSkills", { count: cliTool.bundledSkills.length })}` : ""}`}
          badges={[{ label: cliTool.statusLabel || t("cli.status.recognized"), tone: "neutral" }]}
          expanded={expandedId === cliTool.id}
          onExpandedChange={(expanded, summaryElement) => handleExpandedChange(cliTool.id, expanded, summaryElement)}
          details={(
            <div className="tool-list-row__detail-grid">
              <div>
                <dt>{t("cli.field.command")}</dt>
                <dd>{cliTool.command || t("cli.value.unknown")}</dd>
              </div>
              <div>
                <dt>{t("cli.field.status")}</dt>
                <dd>{cliTool.statusLabel || t("cli.value.unknown")}</dd>
              </div>
              <div>
                <dt>{t("cli.field.executablePath")}</dt>
                <dd title={cliTool.executablePath}>{cliTool.executablePath || t("cli.value.unknown")}</dd>
              </div>
              <div>
                <dt>{t("cli.field.updateCommand")}</dt>
                <dd>{cliTool.updateCommand || t("cli.value.unknown")}</dd>
              </div>
              <div>
                <dt>{t("cli.field.updateStrategy")}</dt>
                <dd>{cliTool.updateStrategy === "self-only" ? t("cli.updateStrategy.selfOnly") : t("cli.updateStrategy.withSkills")}</dd>
              </div>
              <div>
                <dt>{t("cli.field.bundledSkills")}</dt>
                <dd>{cliTool.bundledSkills.join(" · ") || t("cli.empty.bundledSkills")}</dd>
              </div>
              <div>
                <dt>{t("cli.field.description")}</dt>
                <dd>{cliTool.description || t("cli.empty.descriptionValue")}</dd>
              </div>
            </div>
          )}
        />
      ))}
    </ToolListPageShell>
  );
}
