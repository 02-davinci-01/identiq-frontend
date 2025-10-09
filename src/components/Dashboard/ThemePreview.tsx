// app/dashboard/components/ThemePreview.tsx
import React from "react";
import Image from "next/image";
import styles from "@/app/dashboard/styles/dashboard.module.css";

export default function ThemePreview({
  id,
  label,
  img,
  selected = false,
  onSelect,
  applyLabel = "Apply",
}: {
  id: string;
  label: string;
  img: string;
  selected?: boolean;
  onSelect?: (id: string) => void;
  applyLabel?: string;
}) {
  const handleClick = () => {
    if (onSelect) onSelect(id);
  };

  return (
    <div
      role="button"
      aria-pressed={selected}
      onClick={handleClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
      className={`${styles.themePreview} ${selected ? styles.selected : ""}`}
    >
      <div className={styles.previewBox}>
        <Image
          src={img}
          alt={label}
          width={300}
          height={160}
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
        />
      </div>

      <div className={styles.previewActions}>
        <div className={styles.labelStrong}>{label}</div>
        <button
          className={styles.btnSmall}
          onClick={(e) => {
            e.stopPropagation(); // don't double-toggle when pressing Apply
            handleClick();
          }}
          disabled={selected}
          aria-disabled={selected}
          title={selected ? "Selected" : `Apply ${label}`}
        >
          {selected ? "Applied" : applyLabel}
        </button>
      </div>
    </div>
  );
}
