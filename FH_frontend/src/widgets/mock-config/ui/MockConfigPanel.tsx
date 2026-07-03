import { useState, useId } from "react";
import type { Endpoint } from "@/entities/endpoint";
import { CUSTOM_SERVICE_ID } from "@/entities/endpoint";
import { CustomDropdown } from "@/shared/ui/custom-dropdown/CustomDropdown";
import {
  useMockConfigForm,
  COMMON_STATUS_CODES,
  COMMON_DELAY_PRESETS,
  COMMON_HEADER_KEYS,
  COMMON_HEADER_VALUES,
  SERVICE_OPTIONS,
  generateId,
} from "@/features/mock-config";
import styles from "./MockConfigPanel.module.css";

interface MockConfigPanelProps {
  endpoint: Endpoint;
  onSuccess?: () => void;
}

export default function MockConfigPanel({ endpoint, onSuccess }: MockConfigPanelProps) {
  const form = useMockConfigForm(endpoint, onSuccess);
  const { state, actions } = form;

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const customStatusId = useId();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>[ MOCK_API_CONFIG ]</h2>
        <p>&gt; EXTERNAL_SERVICE_INTEGRATION_TEST</p>
      </div>

      <div className={styles.form}>
        {/* Level 1: 서비스 선택 */}
        <div className={styles.formGroup}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              minHeight: "32px",
            }}
          >
            <label style={{ margin: 0 }}>TARGET_SERVICE</label>
            {state.currentService?.docUrl ? (
              <a
                href={state.currentService.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.docLinkBtn}
                title="공식 웹훅 명세서 보기"
              >
                <i className="icon-[mdi--external-link]" /> 공식 문서
              </a>
            ) : null}
          </div>
          <CustomDropdown
            onClose={() => setOpenDropdownId(null)}
            value={state.selectedServiceId}
            options={SERVICE_OPTIONS}
            onSelect={(val) => {
              actions.setSelectedServiceId(String(val));
              actions.setSelectedScenarioId(null);
              setOpenDropdownId(null);
            }}
            placeholder="SELECT_SERVICE…"
            isOpen={openDropdownId === "service"}
            onToggle={() =>
              setOpenDropdownId(openDropdownId === "service" ? null : "service")
            }
            displayValue={(_val, opt) => (opt ? opt.label : "SELECT_SERVICE…")}
          />
        </div>

        {/* Level 2: 시나리오 선택 (CUSTOM 이 아닐 때만 표시) */}
        {state.selectedServiceId !== CUSTOM_SERVICE_ID ? (
          <div className={styles.formGroup}>
            <label>TARGET_PRESET</label>
            <CustomDropdown
              onClose={() => setOpenDropdownId(null)}
              value={state.selectedScenarioId ?? ""}
              options={state.scenarioOptions}
              onSelect={(val) => {
                const scenario = state.currentService?.scenarios.find(
                  (s) => s.id === val,
                );
                if (scenario) actions.applyScenario(scenario);
                setOpenDropdownId(null);
              }}
              placeholder="SELECT_PRESET…"
              isOpen={openDropdownId === "scenario"}
              onToggle={() =>
                setOpenDropdownId(
                  openDropdownId === "scenario" ? null : "scenario",
                )
              }
              displayValue={(_val, opt) => (opt ? opt.label : "SELECT_PRESET…")}
            />
            {state.isDynamic ? (
              <p
                className={styles.warning}
                style={{ marginTop: "0.5rem", color: "#ffcc00" }}
              >
                ⚡ 서버가 요청을 직접 분석해서 응답해요. 아래에 설정한 내용은
                적용되지 않아요.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className={styles.row}>
          <div
            className={styles.formGroup}
            style={{
              opacity: state.isDynamic ? 0.5 : 1,
              pointerEvents: state.isDynamic ? "none" : "auto",
            }}
          >
            <label htmlFor={customStatusId}>STATUS_CODE</label>
            <CustomDropdown
              onClose={() => setOpenDropdownId(null)}
              value={state.statusCode}
              options={COMMON_STATUS_CODES}
              onSelect={(val) => {
                actions.setStatusCode(val);
                actions.setIsCustomStatus(false);
                actions.resetToCustom();
                setOpenDropdownId(null);
              }}
              onCustom={() => {
                actions.setIsCustomStatus(true);
                actions.setStatusCode("");
                actions.resetToCustom();
                setOpenDropdownId(null);
              }}
              customLabel="Custom"
              placeholder="Select Status…"
              isOpen={openDropdownId === "status"}
              onToggle={() =>
                setOpenDropdownId(openDropdownId === "status" ? null : "status")
              }
              isCustomStatus={state.isCustomStatus}
            />
            {state.isCustomStatus ? (
              <input
                id={customStatusId}
                type="number"
                min="100"
                max="599"
                name="status-code"
                autoComplete="off"
                aria-label="Custom status code"
                placeholder="e.g., 418"
                value={state.statusCode}
                onChange={(e) => {
                  actions.setStatusCode(Number(e.target.value));
                  actions.resetToCustom();
                }}
                className={styles.input}
                style={{ marginTop: "0.5rem" }}
              />
            ) : null}
          </div>

          <div
            className={styles.formGroup}
            style={{
              opacity: state.isDynamic ? 0.5 : 1,
              pointerEvents: state.isDynamic ? "none" : "auto",
            }}
          >
            <label>RESPONSE_DELAY (ms)</label>
            <CustomDropdown
              onClose={() => setOpenDropdownId(null)}
              value={state.delayMs}
              options={COMMON_DELAY_PRESETS}
              onSelect={(val) => {
                actions.setDelayMs(val);
                actions.resetToCustom();
                setOpenDropdownId(null);
              }}
              placeholder="e.g., 500"
              isOpen={openDropdownId === "delay"}
              onToggle={() =>
                setOpenDropdownId(openDropdownId === "delay" ? null : "delay")
              }
              isEditable={true}
              onEdit={(val) => {
                actions.setDelayMs(val.replace(/[^0-9]/g, ""));
                actions.resetToCustom();
              }}
              hideNoOptions={true}
            />
          </div>
        </div>

        <div
          className={styles.formGroup}
          style={{
            opacity: state.isDynamic ? 0.5 : 1,
            pointerEvents: state.isDynamic ? "none" : "auto",
          }}
        >
          <label>RESPONSE_HEADERS</label>
          <div className={styles.headerList}>
            {state.headerList.map((h, i) => (
              <div key={h.id} className={styles.headerRow}>
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <CustomDropdown
                    onClose={() => setOpenDropdownId(null)}
                    value={h.key}
                    options={COMMON_HEADER_KEYS}
                    onSelect={(val) => {
                      const newHeaders = state.headerList.map((h, idx) =>
                        idx === i ? { ...h, key: String(val) } : h,
                      );
                      actions.setHeaderList(newHeaders);
                      actions.resetToCustom();
                      setOpenDropdownId(null);
                    }}
                    placeholder="Key"
                    isOpen={openDropdownId === `header-key-${h.id}`}
                    onToggle={() =>
                      setOpenDropdownId(
                        openDropdownId === `header-key-${h.id}`
                          ? null
                          : `header-key-${h.id}`,
                      )
                    }
                    isEditable={true}
                    onEdit={(val) => {
                      const newHeaders = state.headerList.map((h, idx) =>
                        idx === i ? { ...h, key: val } : h,
                      );
                      actions.setHeaderList(newHeaders);
                      actions.resetToCustom();
                    }}
                  />
                </div>

                <span className={styles.headerColon}>:</span>

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <CustomDropdown
                    onClose={() => setOpenDropdownId(null)}
                    value={h.value}
                    options={COMMON_HEADER_VALUES}
                    onSelect={(val) => {
                      const newHeaders = state.headerList.map((h, idx) =>
                        idx === i ? { ...h, value: String(val) } : h,
                      );
                      actions.setHeaderList(newHeaders);
                      actions.resetToCustom();
                      setOpenDropdownId(null);
                    }}
                    placeholder="Value"
                    isOpen={openDropdownId === `header-value-${h.id}`}
                    onToggle={() =>
                      setOpenDropdownId(
                        openDropdownId === `header-value-${h.id}`
                          ? null
                          : `header-value-${h.id}`,
                      )
                    }
                    alignRight={true}
                    isEditable={true}
                    onEdit={(val) => {
                      const newHeaders = state.headerList.map((h, idx) =>
                        idx === i ? { ...h, value: val } : h,
                      );
                      actions.setHeaderList(newHeaders);
                      actions.resetToCustom();
                    }}
                  />
                </div>

                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => {
                    actions.setHeaderList(
                      state.headerList.filter((item) => item.id !== h.id),
                    );
                    actions.resetToCustom();
                  }}
                  title="Remove Header"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className={styles.addHeaderBtn}
              onClick={() => {
                actions.setHeaderList([
                  ...state.headerList,
                  { id: generateId(), key: "", value: "" },
                ]);
                actions.resetToCustom();
              }}
            >
              + ADD HEADER
            </button>
          </div>
          {state.headerWarning ? (
            <p className={styles.warning}>{state.headerWarning}</p>
          ) : null}
        </div>

        <div
          className={styles.formGroup}
          style={{
            opacity: state.isDynamic ? 0.5 : 1,
            pointerEvents: state.isDynamic ? "none" : "auto",
          }}
        >
          <label htmlFor="input-body">RESPONSE_BODY</label>
          <textarea
            id="input-body"
            name="body"
            value={state.body}
            onChange={(e) => {
              actions.setBody(e.target.value);
              actions.resetToCustom();
            }}
            className={`${styles.textarea} ${styles.bodyArea}`}
            rows={8}
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        <button
          onClick={actions.handleApply}
          disabled={
            state.isPending ||
            (state.selectedServiceId !== CUSTOM_SERVICE_ID &&
              state.selectedScenarioId === null)
          }
          className={`${styles.button} ${state.isSaved ? styles.buttonSaved : ""}`}
        >
          {state.isSaved
            ? "✔ SAVED!"
            : state.isPending
              ? "SAVING_CONFIG…"
              : "APPLY_CONFIG"}
        </button>
      </div>
    </div>
  );
}
