// ThemeChart.tsx
import React, { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { UserView } from "../hooks/useInfiniteExperimentalUsers";

type Props = {
  users: UserView[];
};

export function ThemeChart({ users }: Props) {
  const themeDistribution = useMemo(() => {
    const map = new Map<string, { count: number; color: string }>();
    users.forEach((u) => {
      const key = u.theme.name;
      if (!map.has(key)) map.set(key, { count: 0, color: u.theme.color });
      map.get(key)!.count += 1;
    });
    return Array.from(map.entries()).map(([name, obj]) => ({
      name,
      value: obj.count,
      color: obj.color,
    }));
  }, [users]);

  return (
    <div className="themes-card expandable">
      <h3>Theme distribution</h3>
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={themeDistribution}
              dataKey="value"
              nameKey="name"
              outerRadius={64}
              innerRadius={28}
              paddingAngle={4}
            >
              {themeDistribution.map((entry, idx) => (
                <Cell key={`c-${idx}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          marginTop: 8,
          maxHeight: 88,
          overflowY: "auto",
          paddingRight: 6,
        }}
      >
        {themeDistribution.map((t) => (
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
        ))}
      </div>
    </div>
  );
}
