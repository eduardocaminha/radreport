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
      className="min-h-[200px] bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/40 resize-none"
    />
  );
}
