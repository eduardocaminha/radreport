'use client';

interface ResultadoProps {
  laudo: string | null;
  erro: string | null;
  carregando: boolean;
}

export function Resultado({ laudo, erro, carregando }: ResultadoProps) {
  if (carregando) {
    return (
      <div className="bg-muted/30 border border-border/40 rounded-2xl p-6 min-h-[200px] flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary/40 border-t-transparent rounded-full animate-spin" />
          <span>Gerando laudo...</span>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="bg-destructive/5 border border-destructive/30 rounded-2xl p-6 min-h-[200px]">
        <p className="text-destructive">{erro}</p>
      </div>
    );
  }

  if (!laudo) {
    return (
      <div className="bg-muted/20 border border-border/30 border-dashed rounded-2xl p-6 min-h-[200px] flex items-center justify-center">
        <p className="text-muted-foreground/60 text-center">
          O laudo gerado aparecera aqui
        </p>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 border border-border/40 rounded-2xl p-6 min-h-[200px]">
      <pre className="whitespace-pre-wrap font-sans text-foreground text-sm leading-relaxed">
        {laudo}
      </pre>
    </div>
  );
}
