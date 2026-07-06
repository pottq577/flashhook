import type { CSSProperties } from "react";
import styles from "./Skeleton.module.css";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: CSSProperties;
  label?: string;
}

export const Skeleton = ({
  width,
  height,
  borderRadius,
  className = "",
  style,
  label,
}: SkeletonProps) => {
  const inlineStyle: CSSProperties = {
    width: width ?? "100%",
    height: height ?? "1rem",
    borderRadius,
    ...style,
  };

  return (
    <div
      className={`${styles.skeleton} ${className}`}
      style={inlineStyle}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : "true"}
    />
  );
};
