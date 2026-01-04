"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { CustomDot } from "./ChartDotText";

type DistPoint = { x: number; y: number };

type DistributionChartProps = {
  data?: DistPoint[];
  highlightX?: number;
  highlightLabel?: string;
  height?: number;
};

const defaultData: DistPoint[] = [
  { x: 50000, y: 18 },
  { x: 60000, y: 35 },
  { x: 70000, y: 70 },
  { x: 80000, y: 48 },
  { x: 90000, y: 25 },
  { x: 100000, y: 15 },
];

function formatManTick(n: number) {
  // if (n >= 100000) return "10만";
  return `${Math.round(n / 10000)}만`;
}

export function MealLineChart({
  data = defaultData,
  highlightX = 0,
  highlightLabel = "0원",
  height = 220,
}: DistributionChartProps) {
  // highlightX가 data에 없을 수도 있어서 보간점 하나 추가
  const withHighlightPoint = React.useMemo(() => {
    const exists = data.some((d) => d.x === highlightX);
    if (exists) return [...data].sort((a, b) => a.x - b.x);

    const sorted = [...data].sort((a, b) => a.x - b.x);
    let y = sorted[0]?.y ?? 0;

    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (highlightX >= a.x && highlightX <= b.x) {
        const t = (highlightX - a.x) / (b.x - a.x);
        y = a.y + (b.y - a.y) * t;
        break;
      }
    }

    return [...sorted, { x: highlightX, y }].sort((a, b) => a.x - b.x);
  }, [data, highlightX]);

  /** ✅ dot 렌더 함수도 useCallback으로 안정화 */
  const renderDot = React.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (props: any) => (
      <CustomDot
        {...props}
        highlightX={highlightX}
        highlightLabel={highlightLabel}
      />
    ),
    [highlightX, highlightLabel]
  );

  const baseTicks = React.useMemo(
    () => [...data].sort((a, b) => a.x - b.x).map((d) => d.x),
    [data]
  );

  const xTicks = React.useMemo(
    () => withHighlightPoint.map((d) => d.x).sort((a, b) => a - b),
    [withHighlightPoint]
  );

  // 총 7개 중 양끝 제외한 5개
  const innerXTicks = React.useMemo(() => xTicks.slice(1, -1), [xTicks]);

  // 세로선이 닿을 “데이터 최상단”
  const yMax = React.useMemo(
    () => Math.max(...withHighlightPoint.map((d) => d.y)),
    [withHighlightPoint]
  );

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={withHighlightPoint}
          margin={{ top: 50, right: 18, left: 10, bottom: 0 }}
        >
          <XAxis
            dataKey="x"
            type="number"
            scale="linear"
            domain={["dataMin", "dataMax"]}
            ticks={baseTicks}
            interval={0}
            tickFormatter={formatManTick}
            tickMargin={10}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12 }}
          />

          <YAxis hide domain={[0, yMax]} />

          {innerXTicks.map((x) => (
            <ReferenceLine
              key={`v-guide-${x}`}
              segment={[
                { x, y: 0 },
                { x, y: yMax },
              ]}
              stroke="#cfd0d1"
              strokeWidth={1}
              strokeDasharray="2 4"
            />
          ))}

          {/* <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(v: any, _name: any, ctx: any) => {
              const x = ctx?.payload?.x as number;
              return [v, formatWon(x)];
            }}
            labelFormatter={() => ""}
          /> */}
          <Area
            name="분포도"
            type="monotone"
            dataKey="y"
            stroke="#94a3b8"
            strokeWidth={3}
            fill="#cbd5e1"
            fillOpacity={0.25}
            dot={renderDot}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
