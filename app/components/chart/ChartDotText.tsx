export function CustomDot({
  cx,
  cy,
  payload,
  highlightX,
  highlightLabel,
  // Recharts에서 넘겨줄 수 있으면 넣는 게 베스트:
  // viewBox: { x, y, width, height }
  viewBox,
}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
any & {
  highlightX: number;
  highlightLabel: string;
  viewBox?: { x: number; y: number; width: number; height: number };
}) {
  if (cx == null || cy == null) return null;
  const isHighlight = payload?.x === highlightX;
  if (!isHighlight) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="#ffffff"
        stroke="#94a3b8"
        strokeWidth={2}
        opacity={0.9}
      />
    );
  }

  const paddingX = 6;
  const paddingY = 4;

  const baseX = 10; // 기존 xloc
  const baseY = 15; // 기존 yloc

  // 대략적인 텍스트 박스 크기
  const textWidth = highlightLabel.length * 8;
  const textHeight = 16;

  const boxW = textWidth + paddingX * 2;
  const boxH = textHeight + paddingY * 2;

  // 차트 영역이 없으면(=viewBox가 없으면) 기존처럼 동작
  const vb = viewBox ?? { x: 0, y: 0, width: Infinity, height: Infinity };

  // "가장자리 판단용" 여유 마진: 박스 크기 + 약간
  const marginX = boxW + 8;
  const marginY = boxH + 8;

  // 오른쪽 끝에 가까우면 왼쪽으로(기존 -baseX), 왼쪽 끝이면 오른쪽으로(+baseX)
  const flipX =
    cx + marginX > vb.x + vb.width ? -1 : cx - marginX < vb.x ? +1 : -1;

  // 위쪽 끝이면 아래로(+baseY), 아래쪽 끝이면 위로(-baseY)
  const flipY =
    cy - marginY < vb.y ? -1 : cy + marginY > vb.y + vb.height ? +1 : +1;

  const placeLeft = flipX === -1; // 오른쪽 끝이면 true(왼쪽으로 배치)
  const anchor = placeLeft ? "end" : "start";

  // dx/dy를 “항상 안쪽”으로 가도록 결정
  const dx = baseX * flipX;
  const dy = baseY * flipY;

  // rect는 text 기준으로 배치 (text의 x,y를 기준점으로)
  const textX = cx + dx;
  const textY = cy - dy;

  const rectX = placeLeft
    ? textX - boxW - paddingX // end 기준: rect가 textX 왼쪽으로
    : textX - paddingX; // start 기준: 기존처럼

  const rectY = textY - textHeight - paddingY;

  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill="#ff2d2d" />

      <rect
        x={rectX}
        y={rectY}
        width={boxW}
        height={boxH}
        rx={4}
        ry={4}
        fill="white"
        opacity={0.5}
      />

      <text
        x={textX}
        y={textY}
        textAnchor={anchor}
        fontSize={14}
        fontWeight={700}
        fill="#ff2d2d"
      >
        {highlightLabel}
      </text>
    </g>
  );
}
