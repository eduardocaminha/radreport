'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { textoParaHTML, removerFormatacao } from '@/lib/formatador';

interface CopyButtonsProps {
  laudo: string | null;
}

export function CopyButtons({ laudo }: CopyButtonsProps) {
  const [copiado, setCopiado] = useState<'html' | 'texto' | null>(null);

  if (!laudo) return null;

  async function copiarHTML() {
    const html = textoParaHTML(laudo!);
    
    try {
      // Copia HTML rico para o clipboard
      const blob = new Blob([html], { type: 'text/html' });
      const data = new ClipboardItem({
        'text/html': blob,
        'text/plain': new Blob([removerFormatacao(laudo!)], { type: 'text/plain' }),
      });
      await navigator.clipboard.write([data]);
      
      setCopiado('html');
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      // Fallback para texto simples
      await navigator.clipboard.writeText(removerFormatacao(laudo!));
      setCopiado('texto');
      setTimeout(() => setCopiado(null), 2000);
    }
  }

  async function copiarTexto() {
    const texto = removerFormatacao(laudo!);
    await navigator.clipboard.writeText(texto);
    
    setCopiado('texto');
    setTimeout(() => setCopiado(null), 2000);
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={copiarHTML}
        className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700"
      >
        {copiado === 'html' ? 'Copiado!' : 'Copiar HTML'}
      </Button>
      <Button
        variant="outline"
        onClick={copiarTexto}
        className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700"
      >
        {copiado === 'texto' ? 'Copiado!' : 'Copiar Texto'}
      </Button>
    </div>
  );
}
