// src/app/dashboard/users/components/DeleteModal.tsx
import React from "react";
import { GenericModal } from "@/components/Modal/DashboardModal/DashboardModal";
import styles from "@/app/dashboard/styles/dashboard.module.css";

export function DeleteModal({
  open,
  userName,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  userName?: string | null;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <GenericModal
      open={open}
      title="Delete user"
      onClose={() => {
        if (!loading) onClose();
      }}
    >
      <div style={{ padding: "6px 0" }}>
        <p style={{ margin: 0, fontSize: 15 }}>
          {userName
            ? `Do you want to delete ${userName} account?`
            : "Do you want to delete this account?"}
        </p>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 18,
          }}
        >
          <button
            className={styles.btnSmall}
            onClick={() => {
              if (!loading) onClose();
            }}
            disabled={loading}
            style={{
              background: "transparent",
              boxShadow: "none",
              color: "var(--fg)",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            Cancel
          </button>

          <button
            className={styles.btnSmall}
            onClick={onConfirm}
            disabled={loading}
            style={{ background: "#ad2f2f", boxShadow: "none", color: "#fff" }}
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </GenericModal>
  );
}
