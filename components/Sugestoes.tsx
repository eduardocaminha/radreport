'use client';

interface SugestoesProps {
  sugestoes: string[];
}

export function Sugestoes({ sugestoes }: SugestoesProps) {
  if (!sugestoes || sugestoes.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg p-4">
      <p className="text-amber-400 text-sm font-medium mb-2">
        Sugestões de completude:
      </p>
      <ul className="space-y-1">
        {sugestoes.map((sugestao, index) => (
          <li key={index} className="text-amber-300/80 text-sm flex items-start gap-2">
            <span className="text-amber-500">•</span>
            <span>{sugestao}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
