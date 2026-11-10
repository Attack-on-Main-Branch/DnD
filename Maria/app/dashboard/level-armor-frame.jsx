export default function LevelArmorFrame({ level, armor }) {
  return (
    <div className="relative flex shrink-0 flex-col items-center">
      <div
        className={`relative z-20 transition-transform duration-300 ${armor ? "-translate-y-1.5" : ""}`}
      >
        {level}
      </div>
      {armor && <div className="relative z-0 -mt-7">{armor}</div>}
    </div>
  );
}
