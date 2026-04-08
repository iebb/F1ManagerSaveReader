import f1Logo from "@/assets/series/f1.ico";
import f2Logo from "@/assets/series/f2.png";
import f3Logo from "@/assets/series/f3.png";

const logoMap = {
  1: f1Logo,
  2: f2Logo,
  3: f3Logo,
};

export default function SeriesSwitch({ options = [], value = 1, onChange = () => {} }) {
  if (!options.length) {
    return null;
  }

  return (
    <div className="inline-flex border border-white/10 bg-black/10">
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex h-11 min-w-[84px] items-center justify-center px-4 transition ${
              index > 0 ? "border-l border-white/10" : ""
            } ${
              selected
                ? "bg-white/[0.08]"
                : "bg-transparent hover:bg-white/[0.04]"
            }`}
            title={option.label}
            aria-label={option.label}
          >
            <img src={logoMap[option.value]} alt={option.label} className="h-5 w-5 object-contain" />
          </button>
        );
      })}
    </div>
  );
}
