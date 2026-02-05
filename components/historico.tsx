'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ItemHistorico {
  id: string;
  texto: string;
  laudo: string;
  data: string;
}

interface HistoricoProps {
  onSelecionar: (texto: string) => void;
}

const MAX_HISTORICO = 5;

export function useHistorico() {
  const [historico, setHistorico] = useState<ItemHistorico[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('historico');
    if (saved) {
      setHistorico(JSON.parse(saved));
    }
  }, []);

  function adicionarAoHistorico(texto: string, laudo: string) {
    const novoItem: ItemHistorico = {
      id: Date.now().toString(),
      texto: texto.slice(0, 100),
      laudo,
      data: new Date().toLocaleString('pt-BR'),
    };

    setHistorico((prev) => {
      const novo = [novoItem, ...prev].slice(0, MAX_HISTORICO);
      localStorage.setItem('historico', JSON.stringify(novo));
      return novo;
    });
  }

  function limparHistorico() {
    setHistorico([]);
    localStorage.removeItem('historico');
  }

  return { historico, adicionarAoHistorico, limparHistorico };
}

export function Historico({ onSelecionar }: HistoricoProps) {
  const { historico, limparHistorico } = useHistorico();
  const [aberto, setAberto] = useState(false);

  if (historico.length === 0) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setAberto(!aberto)}
        className="text-muted-foreground hover:text-foreground text-xs"
      >
        Historico ({historico.length})
      </Button>

      {aberto && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-card border border-border/50 rounded-2xl shadow-lg z-10">
          <div className="p-4 border-b border-border/30 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Ultimos laudos</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={limparHistorico}
              className="text-xs text-muted-foreground hover:text-destructive h-7 px-3"
            >
              Limpar
            </Button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {historico.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelecionar(item.texto);
                  setAberto(false);
                }}
                className="w-full text-left p-4 hover:bg-muted/50 border-b border-border/30 last:border-0 transition-colors"
              >
                <p className="text-sm text-foreground truncate">{item.texto}</p>
                <p className="text-xs text-muted-foreground mt-1.5">{item.data}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
