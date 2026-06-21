import type { WebhookLog } from "@/entities/log";
import { Virtuoso } from "react-virtuoso";
import { useState, useMemo, memo, useDeferredValue } from "react";
import { useDeleteAllLogsMutation } from "@/entities/log";
import LogItem from "./LogItem";
import styles from "./LogList.module.css";
import ConfirmModal from "@/shared/ui/ConfirmModal";

import { CustomDropdown } from "@/shared/ui/custom-dropdown/CustomDropdown";

const methodOptions = [
  { value: "ALL", label: "All Methods" },
  { value: "GET", label: "GET" },
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" },
  { value: "PATCH", label: "PATCH" },
  { value: "DELETE", label: "DELETE" },
];

interface LogListProps {
  logs: WebhookLog[];
  selectedLogId: string | null;
  onSelect: (logId: string) => void;
  endpointId?: string;
}

const LogList = memo(function LogList({
  logs,
  selectedLogId,
  onSelect,
  endpointId,
}: LogListProps) {
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("ALL");
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState(false);
  const deleteMutation = useDeleteAllLogsMutation(endpointId || "");

  const deferredSearch = useDeferredValue(search);

  const filteredLogs = useMemo(() => {
    const isAllMethods = method === "ALL";
    const trimmedSearch = deferredSearch.trim().toLowerCase();
    const isSearchEmpty = trimmedSearch === "";

    return logs.filter((log) => {
      const matchMethod = isAllMethods || log.method.toUpperCase() === method;
      const matchSearch =
        isSearchEmpty ||
        log.method.toLowerCase().includes(trimmedSearch) ||
        (log.bodyPreview &&
          log.bodyPreview.toLowerCase().includes(trimmedSearch));
      return matchMethod && matchSearch;
    });
  }, [logs, deferredSearch, method]);

  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const handleClearClick = () => {
    setIsClearModalOpen(true);
  };

  const handleConfirmClear = () => {
    setIsClearModalOpen(false);
    deleteMutation.mutate();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <input
            type="text"
            placeholder="method 또는 body 검색…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="로그 페이로드 검색"
            className={styles.searchInput}
          />
          <div className={styles.dropdownWrapper}>
            <CustomDropdown
              value={method}
              options={methodOptions}
              onSelect={(val) => {
                setMethod(String(val));
                setIsMethodDropdownOpen(false);
              }}
              placeholder="Method"
              isOpen={isMethodDropdownOpen}
              onToggle={() => setIsMethodDropdownOpen(!isMethodDropdownOpen)}
              displayValue={(val, opt) =>
                val === "ALL" ? "Methods" : String(opt?.label || val)
              }
              alignRight
            />
          </div>
          {endpointId ? (
            <button
              className={styles.clearBtn}
              onClick={handleClearClick}
              disabled={deleteMutation.isPending || logs.length === 0}
              aria-label="Clear Logs"
              title="Clear Logs"
            >
              {deleteMutation.isPending ? (
                <svg
                  className={styles.spinner}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              )}
            </button>
          ) : null}
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div role="status" className={styles.empty}>
          <p>
            {logs.length === 0
              ? "아직 들어온 웹훅이 없어요."
              : "검색 결과가 없어요."}
          </p>
          {logs.length === 0 ? (
            <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
              위의 웹훅 URL로 요청을 보내면 이곳에서 실시간으로 확인할 수
              있어요.
            </p>
          ) : null}
          {logs.length > 0 && (search || method !== "ALL") ? (
            <button
              className={styles.resetBtn}
              onClick={() => {
                setSearch("");
                setMethod("ALL");
              }}
            >
              필터 초기화
            </button>
          ) : null}
        </div>
      ) : (
        <Virtuoso
          style={{ height: "100%" }}
          data={filteredLogs}
          computeItemKey={(_, log) => log.logId}
          itemContent={(_index, log) => (
            <div style={{ paddingBottom: "0.5rem" }}>
              <LogItem
                log={log}
                isSelected={selectedLogId === log.logId}
                onSelect={onSelect}
              />
            </div>
          )}
        />
      )}

      <ConfirmModal
        isOpen={isClearModalOpen}
        title="모든 로그 삭제"
        message="정말로 모든 웹훅 로그를 삭제하시겠어요? 이 작업은 되돌릴 수 없어요."
        onConfirm={handleConfirmClear}
        onCancel={() => setIsClearModalOpen(false)}
      />
    </div>
  );
});

export default LogList;
