'use client';

interface ResultadoProps {
  laudo: string | null;
  erro: string | null;
  carregando: boolean;
}

export function Resultado({ laudo, erro, carregando }: ResultadoProps) {
  if (carregando) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 min-h-[200px] flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
          <span>Gerando laudo...</span>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="bg-red-950/30 border border-red-800 rounded-lg p-6 min-h-[200px]">
        <p className="text-red-400">{erro}</p>
      </div>
    );
  }

  if (!laudo) {
    return (
      <div className="bg-zinc-800/50 border border-zinc-700 border-dashed rounded-lg p-6 min-h-[200px] flex items-center justify-center">
        <p className="text-zinc-500 text-center">
          O laudo gerado aparecerá aqui
        </p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 min-h-[200px]">
      <pre className="whitespace-pre-wrap font-sans text-zinc-100 text-sm leading-relaxed">
        {laudo}
      </pre>
    </div>
  );
}
