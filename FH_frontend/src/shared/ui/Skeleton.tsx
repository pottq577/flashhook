import { CSSProperties } from "react";
import styles from "./Skeleton.module.css";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: CSSProperties;
}

export const Skeleton = ({
  width,
  height,
  borderRadius,
  className = "",
  style,
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
      aria-hidden="true"
    />
  );
};
