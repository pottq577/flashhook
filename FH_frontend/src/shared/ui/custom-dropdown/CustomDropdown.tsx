import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './CustomDropdown.module.css';

interface CustomDropdownProps {
  value: string | number;
  options: { value: string | number; label: string; desc?: string }[];
  onSelect: (val: string | number) => void;
  onCustom?: () => void;
  customLabel?: string;
  placeholder: string;
  isOpen: boolean;
  onToggle: () => void;
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
  isCustomStatus,
  displayValue,
  alignRight,
  isEditable,
  onEdit,
  hideNoOptions,
}: CustomDropdownProps) {
  const selected = options.find((o) => o.value === value);
  const isCustom = isCustomStatus ?? (!selected && value !== '');

  const [inputValue, setInputValue] = useState(String(value));
  const [prevValue, setPrevValue] = useState(String(value));
  
  if (String(value) !== prevValue) {
    setPrevValue(String(value));
    setInputValue(String(value));
  }

  const filteredOptions = useMemo(() => {
    if (!isEditable || inputValue === '') return options;
    const lowerInput = inputValue.toLowerCase();
    return options.filter(
      (o) =>
        String(o.label).toLowerCase().includes(lowerInput) ||
        String(o.value).toLowerCase().includes(lowerInput),
    );
  }, [isEditable, inputValue, options]);

  return (
    <div className={styles.statusInputWrapper}>
      <div
        className={styles.customSelectTrigger}
        onClick={!isEditable ? onToggle : undefined}
        role="combobox"
        aria-expanded={isOpen}
        tabIndex={!isEditable ? 0 : -1}
        onKeyDown={
          !isEditable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
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
                  : `${selected.value !== selected.label ? selected.value + ' ' : ''}${selected.label}`
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
        {isOpen && (
          <motion.div
            className={styles.customSelectDropdown}
            role="listbox"
            style={alignRight ? { right: 0, left: 'auto' } : undefined}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((o) => (
                <div
                  key={String(o.value)}
                  className={`${styles.customSelectOption} ${value === o.value && !isCustom ? styles.selected : ''}`}
                  role="option"
                  aria-selected={value === o.value && !isCustom}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(o.value);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(o.value);
                  }}
                >
                  {o.value !== o.label && (
                    <span className={styles.optionValue}>{o.value}</span>
                  )}
                  <div className={styles.optionTextContainer}>
                    <span className={styles.optionLabel}>{o.label}</span>
                    {o.desc && <span className={styles.optionDesc}>{o.desc}</span>}
                  </div>
                </div>
              ))
            ) : (
              !hideNoOptions && (
                <div
                  className={styles.customSelectOption}
                  style={{ opacity: 0.5 }}
                >
                  <span className={styles.optionLabel}>No matching options</span>
                </div>
              )
            )}
            {onCustom && !isEditable && (
              <div
                className={`${styles.customSelectOption} ${isCustom ? styles.selected : ''}`}
                role="option"
                aria-selected={isCustom}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onCustom();
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onCustom();
                }}
              >
                <span className={styles.optionValue}>Custom...</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
