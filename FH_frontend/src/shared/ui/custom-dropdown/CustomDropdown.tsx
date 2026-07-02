import { useState, useMemo, useRef, useEffect, useEffectEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./CustomDropdown.module.css";

interface CustomDropdownProps {
  value: string | number;
  options: { value: string | number; label: string; desc?: string }[];
  onSelect: (val: string | number) => void;
  onCustom?: () => void;
  customLabel?: string;
  placeholder: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose?: () => void;
  isCustomStatus?: boolean;
  displayValue?: (
    val: string | number,
    opt?: { value: string | number; label: string; desc?: string },
  ) => string;
  alignRight?: boolean;
  isEditable?: boolean;
  onEdit?: (val: string) => void;
  hideNoOptions?: boolean;
}

export function CustomDropdown({
  value,
  options,
  onSelect,
  onCustom,
  customLabel,
  placeholder,
  isOpen,
  onToggle,
  onClose,
  isCustomStatus,
  displayValue,
  alignRight,
  isEditable,
  onEdit,
  hideNoOptions,
}: CustomDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  if (!isOpen && activeIndex !== -1) {
    setActiveIndex(-1);
  }

  const handleClose = useEffectEvent(() => {
    if (onClose) onClose();
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        if (isOpen) {
          handleClose();
        }
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selected = options.find((o) => o.value === value);
  const isCustom = isCustomStatus ?? (!selected && value !== "");

  const [inputValue, setInputValue] = useState(String(value));
  const [prevValue, setPrevValue] = useState(String(value));

  if (String(value) !== prevValue) {
    setPrevValue(String(value));
    setInputValue(String(value));
  }

  const filteredOptions = useMemo(() => {
    if (!isEditable || inputValue === "") return options;
    const isTyping = String(value) !== inputValue;
    if (!isTyping) return options;
    const lowerInput = inputValue.toLowerCase();
    return options.filter(
      (o) =>
        String(o.label).toLowerCase().includes(lowerInput) ||
        String(o.value).toLowerCase().includes(lowerInput),
    );
  }, [isEditable, inputValue, options, value]);

  return (
    <div className={styles.statusInputWrapper} ref={containerRef} onKeyDown={(e) => {
      if (isOpen) {
        const maxIndex = filteredOptions.length + (onCustom && !isEditable ? 1 : 0) - 1;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
        } else if (e.key === "Enter") {
          if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
            e.preventDefault();
            onSelect(filteredOptions[activeIndex].value);
          } else if (activeIndex === filteredOptions.length && onCustom) {
            e.preventDefault();
            onCustom();
          }
        } else if (e.key === "Escape") {
          e.preventDefault();
          if (onClose) onClose();
          else onToggle();
        }
      } else {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          onToggle();
          setActiveIndex(0);
        }
      }
    }}>
      <div
        className={styles.customSelectTrigger}
        onClick={!isEditable ? onToggle : undefined}
        role="combobox"
        aria-expanded={isOpen}
        tabIndex={!isEditable ? 0 : -1}
        onKeyDown={
          !isEditable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle();
                }
              }
            : undefined
        }
      >
        {isEditable ? (
          <input
            type="text"
            name="dropdown-search"
            autoComplete="off"
            spellCheck={false}
            aria-label={placeholder}
            className={styles.customSelectInput}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (onEdit) onEdit(e.target.value);
              if (!isOpen) onToggle();
            }}
            onFocus={() => {
              if (!isOpen) onToggle();
            }}
            placeholder={placeholder}
          />
        ) : (
          <span className={styles.customSelectText}>
            {isCustom
              ? customLabel
                ? `${customLabel}: ${value}`
                : value || placeholder
              : selected
                ? displayValue
                  ? displayValue(value, selected)
                  : `${selected.value !== selected.label ? selected.value + " " : ""}${selected.label}`
                : placeholder}
          </span>
        )}
        <span
          className={styles.customSelectIcon}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          ▼
        </span>
      </div>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            className={styles.customSelectDropdown}
            role="listbox"
            style={alignRight ? { right: 0, left: "auto" } : undefined}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((o, idx) => (
                <div
                  key={String(o.value)}
                  className={`${styles.customSelectOption} ${value === o.value && !isCustom ? styles.selected : ""} ${activeIndex === idx ? styles.activeItem : ""}`}
                  role="option"
                  aria-selected={value === o.value && !isCustom}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelect(o.value);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(o.value);
                  }}
                >
                  <div className={styles.optionTextContainer}>
                    <div className={styles.optionPrimary}>
                      <span className={styles.optionLabel}>{o.label}</span>
                      {o.desc ? (
                        <span className={styles.optionDesc}>{o.desc}</span>
                      ) : null}
                    </div>
                    {o.value !== o.label ? (
                      <span className={styles.optionValue}>
                        {String(o.value)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            ) : !hideNoOptions ? (
              <div
                className={styles.customSelectOption}
                style={{ opacity: 0.5 }}
              >
                <span className={styles.optionLabel}>No matching options</span>
              </div>
            ) : null}
            {onCustom && !isEditable ? (
              <div
                className={`${styles.customSelectOption} ${isCustom ? styles.selected : ""} ${activeIndex === filteredOptions.length ? styles.activeItem : ""}`}
                role="option"
                aria-selected={isCustom}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onCustom();
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCustom();
                }}
              >
                <span className={styles.optionValue}>Custom…</span>
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
