// src/app/dashboard/users/components/ThemePanel.tsx
import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

type ThemeDatum = { name: string; value: number; color: string };

export function ThemePanel({ data }: { data: ThemeDatum[] }) {
  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ marginTop: 0, marginBottom: 8 }}>Theme distribution</h3>

      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={64}
              innerRadius={28}
              paddingAngle={4}
            >
              {data.map((entry, idx) => (
                <Cell key={`c-${idx}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          marginTop: 10,
          maxHeight: 96,
          overflowY: "auto",
          paddingRight: 6,
        }}
      >
        {data.length === 0 ? (
          <div style={{ color: "#666", fontSize: 13 }}>No theme data yet.</div>
        ) : (
          data.map((t) => (
            <div
              key={t.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  background: t.color,
                  borderRadius: 3,
                }}
              />
              <div style={{ fontSize: 13 }}>
                {t.name} — {t.value}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
