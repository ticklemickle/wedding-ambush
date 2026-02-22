import React from "react";

export type SummaryVariant = "top20" | "mid" | "bottom20" | "bottom10";

type Props = {
  regionName: string;
  dateLabel: string;
  time: string;
  variant: SummaryVariant;
};

/** 메시지 토큰: 일반 텍스트 vs 강조 토큰 */
type MsgPart =
  | { kind: "text"; value: string }
  | {
      kind: "highlight";
      value: string;
      parens?: boolean; // ( )로 감싸기
    };

type VariantSpec = {
  title: string; // main
  emoji: string;
  borderColor: string; // 카드 상단 보더
  accentColor: string; // 일반 강조색(필요 시)
  gradientFrom: string; // 제목 그라데이션 시작
  gradientTo: string; // 제목 그라데이션 끝
  messageParts: MsgPart[]; // sub + highlight
};

/** ✅ 반복되는 스타일/렌더를 함수화하기 위한 유틸들 */
function toCssGradient(from: string, to: string) {
  return `linear-gradient(90deg, ${from}, ${to})`;
}

function gradientTextStyle(from: string, to: string): React.CSSProperties {
  return {
    backgroundImage: toCssGradient(from, to),
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  };
}

function pickVariant(variant: SummaryVariant): VariantSpec {
  // 여기에만 문구/컬러 정의하면 끝 (유지보수 쉬움)
  const map: Record<SummaryVariant, VariantSpec> = {
    top20: {
      title: "갓성비 등판",
      emoji: "✨",
      borderColor: "#00BC8B",
      accentColor: "#00BC8B",
      gradientFrom: "#00d79e",
      gradientTo: "#00f1b1",
      messageParts: [
        { kind: "text", value: "“지금 " },
        { kind: "highlight", value: "당장", parens: true },
        { kind: "text", value: " 계약하세요! 다시는 안 올 가격”" },
      ],
    },
    mid: {
      title: "평타 쳤다",
      emoji: "👍",
      borderColor: "#0066FF",
      accentColor: "#0066FF",
      gradientFrom: "#0066FF",
      gradientTo: "#4DA3FF",
      messageParts: [
        { kind: "text", value: "“남들이랑 " },
        { kind: "highlight", value: "비슷한 가격", parens: true },
        { kind: "text", value: "으로 잘 잡으셨어요”" },
      ],
    },
    bottom20: {
      title: "쪼그금 아쉬워",
      emoji: "🤔",
      borderColor: "#FF6600",
      accentColor: "#FF6600",
      gradientFrom: "#FF6600",
      gradientTo: "#ffa15a",
      messageParts: [
        { kind: "text", value: "“" },
        { kind: "highlight", value: "언제든지", parens: true },
        { kind: "text", value: " 또 만날 수 있는 가격”" },
      ],
    },
    bottom10: {
      title: "정말 이 가격?",
      emoji: "😱",
      borderColor: "#FF3300",
      accentColor: "#FF3300",
      gradientFrom: "#FF3300",
      gradientTo: "#ff825c",
      messageParts: [
        { kind: "text", value: "“" },
        { kind: "highlight", value: "성수기", parens: true },
        { kind: "text", value: "와 " },
        { kind: "highlight", value: "인기 시간", parens: true },
        { kind: "text", value: "을 선택하셨나보네요!”" },
      ],
    },
  };

  return map[variant];
}

/** ✅ 메시지 렌더: highlight만 글씨를 약간 키우고, ( ) 처리 */
function RenderMessage({
  parts,
  highlightColor,
}: {
  parts: MsgPart[];
  highlightColor: string;
}) {
  return (
    <>
      {parts.map((p, idx) => {
        if (p.kind === "text")
          return <React.Fragment key={idx}>{p.value}</React.Fragment>;

        const text = p.parens ? `${p.value}` : p.value;

        return (
          <span
            key={idx}
            className="font-semibold text-[1.05rem]" // ✅ highlight만 살짝 크게
            style={{ color: highlightColor }}
          >
            {text}
          </span>
        );
      })}
    </>
  );
}

export default function SummaryCard({
  regionName,
  dateLabel,
  time,
  variant,
}: Props) {
  const v = pickVariant(variant);

  return (
    <section
      className="bg-white rounded-2xl shadow p-5 text-center border-t-4"
      style={{ borderColor: v.borderColor }}
    >
      <p className="text-sm text-gray-600 font-340">
        {regionName} ({dateLabel} {time})
      </p>

      {/* ✅ main: 그라데이션 텍스트 */}
      <h1 className="text-3xl font-Jalnan2 mt-2">
        <span style={gradientTextStyle(v.gradientFrom, v.gradientTo)}>
          {v.title}
        </span>
        {v.emoji}
      </h1>

      {/* sub + highlight */}
      <p className="text-sm font-350 mt-2 text-slate-600">
        <RenderMessage parts={v.messageParts} highlightColor={v.accentColor} />
      </p>
    </section>
  );
}
