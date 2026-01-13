'use client';

import { Textarea } from '@/components/ui/textarea';

interface EditorProps {
  valor: string;
  onChange: (valor: string) => void;
  disabled?: boolean;
}

export function Editor({ valor, onChange, disabled }: EditorProps) {
  return (
    <Textarea
      placeholder="Cole ou digite o texto ditado aqui...

Exemplos:
• tc abdome com contraste, microcalculo no rim esquerdo 0,2
• tomo torax sem, normal
• tc cranio sem contraste, avc isquemico no territorio da acm direita"
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="min-h-[200px] bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 resize-none"
    />
  );
}
