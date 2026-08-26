import { Maximize2, Minimize2 } from "lucide-react";

interface ChatPanelSizeToggleProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export default function ChatPanelSizeToggle({
  isExpanded,
  onToggle,
}: ChatPanelSizeToggleProps) {
  const label = isExpanded ? "Perkecil percakapan" : "Perlebar percakapan";
  const Icon = isExpanded ? Minimize2 : Maximize2;

  return (
    <button
      type="button"
      aria-controls="glucocare-chat-panel"
      aria-label={label}
      aria-pressed={isExpanded}
      title={label}
      onClick={onToggle}
      className="hidden h-8 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-white/10 px-2.5 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:flex"
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      <span className="hidden text-[10px] font-bold xl:inline">{isExpanded ? "Perkecil" : "Perlebar"}</span>
    </button>
  );
}
