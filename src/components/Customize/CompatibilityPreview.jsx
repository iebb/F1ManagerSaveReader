import * as React from "react";

const LANGUAGES = [
  {key: "Lat", label: "Latin"},
  {key: "Rus", label: "Russian"},
  {key: "Chn", label: "Chinese"},
  {key: "Jpn", label: "Japanese"},
];

function getCharacterTone(info) {
  const supported = LANGUAGES.filter((language) => info[language.key]).length;
  if (supported === LANGUAGES.length) {
    return "border-emerald-400/25 bg-emerald-500/12 text-emerald-100";
  }
  if (supported === 0) {
    return "border-rose-400/25 bg-rose-500/12 text-rose-100";
  }
  return "border-amber-400/25 bg-amber-500/12 text-amber-100";
}

const legendItems = [
  {
    label: "All languages",
    tone: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
  },
  {
    label: "Some languages",
    tone: "border-amber-400/25 bg-amber-500/10 text-amber-200",
  },
  {
    label: "Unsupported",
    tone: "border-rose-400/25 bg-rose-500/10 text-rose-200",
  },
];

export default function CompatibilityPreview({compatibility}) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {compatibility.Characters.map((info, index) => {
          if (info.separator) {
            return <div key={`separator-${index}`} className="w-3" />;
          }

          const missingLabels = LANGUAGES.filter((language) => !info[language.key]).map((language) => language.label);
          const title = missingLabels.length
            ? `Missing: ${missingLabels.join(", ")}`
            : "Supported in all languages";

          return (
            <div
              key={`${info.char}-${index}`}
              title={title}
              className={`flex h-9 min-w-9 items-center justify-center border px-2 text-base leading-none ${getCharacterTone(info)}`}
            >
              {info.char}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {legendItems.map((item) => (
          <span
            key={item.label}
            className={`border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${item.tone}`}
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
