# MeusLaudos - Sistema Pessoal de Laudos de TC

## 1. Visão Geral

Sistema pessoal para auxiliar na geração de laudos de tomografia computadorizada (TC), composto por um web app hospedado na Vercel.

### Fluxo Principal
1. Radiologista dita laudo via Wispr Flow → texto gerado
2. Abre o web app (já logado)
3. Cola texto na caixa de entrada
4. Clica "Gerar"
5. Claude processa e estrutura o laudo
6. Visualiza resultado formatado
7. Copia (HTML ou plain text) e cola no RIS

---

## 2. Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                         VERCEL                              │
│                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│   │   Frontend  │    │  API Route  │    │  Templates  │   │
│   │  (Next.js)  │───►│  /api/gerar │───►│    (.md)    │   │
│   │             │    │             │    │             │   │
│   └─────────────┘    └──────┬──────┘    └─────────────┘   │
│                             │                              │
└─────────────────────────────┼──────────────────────────────┘
                              │ HTTPS
                              ▼
                     ┌─────────────────┐
                     │  Anthropic API  │
                     │    (Claude)     │
                     └─────────────────┘
```

**Stack:**
- Next.js 15 (App Router)
- Vercel (hospedagem)
- Tailwind CSS (estilos)
- Shadcn (componentes)
- Auth: senha via env var (sem DB)
- Templates: arquivos .md no repo

---

## 3. Estrutura de Arquivos

```
meuslaudos/
├── app/
│   ├── layout.tsx              # Layout global
│   ├── page.tsx                # Tela principal (gerar laudo)
│   ├── login/
│   │   └── page.tsx            # Tela de login
│   ├── api/
│   │   ├── auth/
│   │   │   └── route.ts        # Login/logout
│   │   └── gerar/
│   │       └── route.ts        # Gera laudo via Claude
│   └── globals.css             # Estilos globais
│
├── components/
│   ├── Editor.tsx              # Área de input do texto
│   ├── Resultado.tsx           # Exibe laudo gerado
│   ├── Sugestoes.tsx           # Lista de completude
│   └── CopyButtons.tsx         # Botões copiar HTML/texto
│
├── lib/
│   ├── claude.ts               # Chamadas à API Claude
│   ├── templates.ts            # Carrega e processa templates
│   ├── auth.ts                 # Lógica de autenticação
│   └── prompts.ts              # Prompts do sistema
│
├── templates/
│   ├── INDEX.md                # Índice de templates
│   ├── mascaras/
│   │   ├── tc-abdome-sem-contraste.md
│   │   ├── tc-abdome-com-contraste.md
│   │   └── ...
│   └── achados/
│       ├── rim/
│       │   ├── microcalculo.md
│       │   └── ...
│       ├── apendice/
│       │   └── apendicite-aguda.md
│       └── ...
│
├── middleware.ts               # Protege rotas (verifica auth)
├── .env.local                  # Variáveis locais (não commitado)
├── .env.example                # Template de variáveis
├── package.json
├── tailwind.config.js
└── next.config.js
```

---

## 4. Sistema de Templates

### 4.1 Máscaras

Cada máscara é um laudo completo "normal" para um tipo específico de TC. O LLM usa a máscara como base e substitui trechos conforme os achados ditados.

**Formato do arquivo de máscara:**

```markdown
---
tipo: tc-abdome
contraste: sem
urgencia_padrao: true
---

TOMOGRAFIA COMPUTADORIZADA DO ABDOME TOTAL
<!-- OPCIONAL:urgencia - remover se "eletivo", "ambulatorial" ou similar -->
Exame realizado em caráter de urgência
<!-- /OPCIONAL:urgencia -->

TÉCNICA:
Exame realizado em aparelho multislice, sem a injeção endovenosa do meio de contraste iodado.

ANÁLISE:
<!-- REGIAO:figado -->
Fígado de dimensões normais, contornos regulares e bordas finas...
<!-- /REGIAO:figado -->

<!-- REGIAO:rins -->
Rins tópicos, de dimensões normais...
<!-- /REGIAO:rins -->

...
```

### 4.2 Achados

Cada achado é uma frase padrão que substitui a frase normal de uma região específica.

**Formato do arquivo de achado:**

```markdown
---
regiao: rins
palavras_chave: [microcalculo, microlitiase, calculo pequeno]
requer: [lado]
opcional: [medida]
medida_default: "menor que 0,3 cm"
---

Rins tópicos, de dimensões normais... Microcálculo não obstrutivo {{lado}}, {{medida}}. Ausência de dilatação dos sistemas coletores.
```

### 4.3 Placeholders

| Placeholder | Descrição | Regra |
|-------------|-----------|-------|
| `{{medida}}` | Tamanho em cm | Uma casa decimal, sempre "cm" (ex: 1,1 cm) |
| `{{lado}}` | Lateralidade | "à direita", "à esquerda", "bilateral" |
| `{{localizacao}}` | Local específico | Ex: "no lobo inferior direito" |
| `{{contagem}}` | Quantidade | Ex: "único", "dois", "múltiplos" |

### 4.4 Blocos Opcionais

| Bloco | Padrão | Remove quando |
|-------|--------|---------------|
| `urgencia` | Incluído | "eletivo", "ambulatorial", "não é urgência" |

### 4.5 Regras Gerais de Formatação

- Medidas: sempre uma casa decimal (1,0 cm, não 1 cm)
- Unidade: sempre "cm" abreviado
- Números: por extenso até dez, depois numeral
- Lateralidade: "à direita/esquerda" (não "no lado direito")

### 4.6 Níveis de Validação

| Nível | Tipo | Comportamento |
|-------|------|---------------|
| **Essencial** | ERRO | Bloqueia geração, retorna mensagem de erro |
| **Importante** | AVISO | Gera laudo + retorna sugestões de completude |

**Essenciais (bloqueiam):**
- Contraste sim/não (se não especificado)
- `{{medida}}` quando marcado como `requer` no achado
- `{{lado}}` quando marcado como `requer` no achado

**Importantes (sugerem):**
- Achados sem máscara pré-definida → LLM usa conhecimento médico
- Descrições incompletas de fraturas, lesões, etc.

### 4.7 Fluxo de Processamento

**Cenário A: Com máscara/achado definido**
1. Usuário digita: "tc abdome sem contraste, microcalculo no rim esquerdo 0,2"
2. LLM identifica:
   - Máscara: `tc-abdome-sem-contraste.md`
   - Achado: `rim/microcalculo.md`
   - Variáveis: lado="à esquerda", medida="0,2 cm"
3. LLM monta laudo usando máscara + achado
4. Retorna laudo final

**Cenário B: Sem máscara/achado (ex: fratura)**
1. Usuário digita: "tc bacia, fratura do ramo do púbis"
2. LLM identifica:
   - Máscara: `tc-bacia-sem-contraste.md`
   - Achado: não tem template pré-definido
3. LLM gera descrição + analisa completude
4. Retorna:
   - `laudo`: texto gerado
   - `sugestoes`: ["tipo de traço", "desvio", ...]

**Cenário C: Faltando essencial**
1. Usuário digita: "tc abdome, microcalculo no rim"
2. LLM detecta: faltando contraste
3. Retorna:
   - `erro`: "Especificar: com ou sem contraste"
   - `laudo`: null

---

## 5. Plano de Etapas

### ETAPA 1: Setup do Projeto
**Objetivo:** Criar estrutura base do Next.js com Tailwind.

**Tarefas:**
- [ ] `npx create-next-app@latest` com App Router
- [ ] Configurar Tailwind CSS
- [ ] Criar `.env.example` com variáveis necessárias
- [ ] Estrutura de pastas conforme seção 3

**Teste:** `npm run dev` funciona, página inicial carrega.

---

### ETAPA 2: Autenticação Simples
**Objetivo:** Proteger o app com senha via env var.

**Arquivos:**
- [ ] `app/login/page.tsx` - tela de login
- [ ] `app/api/auth/route.ts` - valida senha, cria cookie
- [ ] `middleware.ts` - protege rotas
- [ ] `lib/auth.ts` - funções auxiliares

**Variáveis de ambiente:**
```
APP_PASSWORD=suasenha
AUTH_SECRET=chave-para-cookie
```

**Teste:** Acessar `/` redireciona para `/login`. Login com senha correta redireciona para `/`.

---

### ETAPA 3: Interface Principal
**Objetivo:** Criar UI para entrada de texto e exibição de resultado.

**Arquivos:**
- [ ] `app/page.tsx` - página principal
- [ ] `components/Editor.tsx` - textarea para input
- [ ] `components/Resultado.tsx` - exibe laudo
- [ ] `components/CopyButtons.tsx` - botões copiar

**Funcionalidades:**
- Textarea grande para colar texto
- Botão "Gerar Laudo"
- Área de resultado (inicialmente vazia)
- Botões "Copiar HTML" e "Copiar Texto"

**Teste:** UI funciona, botões respondem (ainda sem integração com API).

---

### ETAPA 4: Integração com Claude API
**Objetivo:** Fazer chamadas à API do Claude funcionar.

**Arquivos:**
- [ ] `lib/claude.ts` - função `gerarLaudo(texto)`
- [ ] `app/api/gerar/route.ts` - endpoint POST

**Variáveis de ambiente:**
```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

**Estrutura de resposta:**
```json
{
  "laudo": "texto do laudo ou null",
  "sugestoes": ["item 1", "item 2"],
  "erro": "mensagem ou null"
}
```

**Teste:** Enviar texto via API, receber resposta do Claude.

---

### ETAPA 5: Carregamento de Templates
**Objetivo:** Ler templates .md e enviar para o Claude como contexto.

**Arquivos:**
- [ ] `lib/templates.ts` - funções para ler .md

**Funcionalidades:**
- `carregarMascaras()` - retorna todas as máscaras
- `carregarAchados()` - retorna todos os achados
- Formata como contexto para o prompt

**Teste:** Templates são lidos e incluídos no prompt.

---

### ETAPA 6: Prompts Otimizados
**Objetivo:** Criar prompts que usam os templates corretamente.

**Arquivos:**
- [ ] `lib/prompts.ts` - system prompt e user prompt

**System prompt inclui:**
- Instruções de comportamento
- Todas as máscaras disponíveis
- Todos os achados disponíveis
- Regras de formatação
- Níveis de validação

**Teste:** Laudo gerado usa templates corretamente.

---

### ETAPA 7: Formatação HTML
**Objetivo:** Gerar HTML formatado para colar em editores.

**Funcionalidades em `lib/formatador.ts`:**
- `textoParaHTML(texto)` - aplica estilos inline
- Fonte Arial, 11pt
- Títulos em negrito

**Teste:** HTML cola corretamente em TinyMCE.

---

### ETAPA 8: Exibição de Sugestões
**Objetivo:** Mostrar sugestões de completude quando aplicável.

**Arquivos:**
- [ ] `components/Sugestoes.tsx` - lista de sugestões

**UI:**
- Se há sugestões, mostra lista abaixo do laudo
- Visual discreto, não invasivo

**Teste:** "tc bacia, fratura do púbis" mostra sugestões.

---

### ETAPA 9: Tratamento de Erros
**Objetivo:** Exibir erros de forma clara.

**Cenários:**
- Falta contraste → mostra erro específico
- API timeout → mensagem amigável
- Erro de rede → instrução para tentar novamente

**Teste:** Erros são exibidos de forma clara.

---

### ETAPA 10: Modo PS (Pronto-Socorro)
**Objetivo:** Toggle para ajustar comportamento dos prompts.

**Funcionalidades:**
- Switch "Modo PS" na interface
- Quando ativo, prompt é mais conciso
- Salvo em localStorage

**Teste:** Laudos diferem com modo PS ligado/desligado.

---

### ETAPA 11: Deploy na Vercel
**Objetivo:** Publicar o app.

**Tarefas:**
- [ ] Conectar repo ao Vercel
- [ ] Configurar variáveis de ambiente
- [ ] Testar em produção

**Teste:** App funciona em URL pública.

---

### ETAPA 12: Refinamentos
**Objetivo:** Melhorar UX baseado em uso real.

**Possíveis melhorias:**
- Loading states melhores
- Histórico de laudos (localStorage)
- Atalhos de teclado (Ctrl+Enter para gerar)
- Tema escuro

---

## 6. Especificações Técnicas

### 6.1 Variáveis de Ambiente

```bash
# .env.example

# Autenticação
APP_PASSWORD=sua_senha_aqui
AUTH_SECRET=chave_secreta_32_caracteres

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

### 6.2 API Route: /api/gerar

```typescript
// app/api/gerar/route.ts

import { gerarLaudo } from '@/lib/claude';

export async function POST(request: Request) {
  const { texto, modoPS } = await request.json();
  
  if (!texto) {
    return Response.json({ erro: 'Texto não fornecido' }, { status: 400 });
  }
  
  try {
    const resultado = await gerarLaudo(texto, modoPS);
    return Response.json(resultado);
  } catch (error) {
    return Response.json({ erro: 'Erro ao gerar laudo' }, { status: 500 });
  }
}
```

### 6.3 Chamada ao Claude

```typescript
// lib/claude.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function gerarLaudo(texto: string, modoPS: boolean) {
  const systemPrompt = montarSystemPrompt(modoPS);
  
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      { role: 'user', content: texto }
    ],
  });
  
  return JSON.parse(message.content[0].text);
}
```

### 6.4 Middleware de Auth

```typescript
// middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('auth');
  
  if (!authCookie && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 7. Tratamento de Erros

| Erro | Mensagem para usuário |
|------|----------------------|
| Texto vazio | "Digite ou cole um texto para gerar o laudo" |
| Falta contraste | "Especificar: com ou sem contraste" |
| Falta medida obrigatória | "Especificar medida do [achado]" |
| API timeout | "Tempo esgotado. Tente novamente" |
| Erro de rede | "Erro de conexão. Verifique sua internet" |
| Erro interno | "Erro ao processar. Tente novamente" |

---

## 8. UI/UX

### Tela Principal

```
┌─────────────────────────────────────────────────────────┐
│  MeusLaudos                              [Modo PS: OFF] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Cole ou digite o texto aqui...                  │   │
│  │                                                 │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [ Gerar Laudo ]                                        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  RESULTADO:                                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │ TOMOGRAFIA COMPUTADORIZADA DO ABDOME TOTAL      │   │
│  │ Exame realizado em caráter de urgência          │   │
│  │                                                 │   │
│  │ TÉCNICA:                                        │   │
│  │ Exame realizado em aparelho multislice...       │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [ Copiar HTML ]  [ Copiar Texto ]                     │
│                                                         │
│  ⚠️ Sugestões:                                          │
│  • Considere especificar tipo de traço                 │
│  • Considere especificar desvio                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Tela de Login

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                      MeusLaudos                         │
│                                                         │
│              ┌─────────────────────────┐               │
│              │ ••••••••               │               │
│              └─────────────────────────┘               │
│                                                         │
│                    [ Entrar ]                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 9. Próximos Passos (Pós-MVP)

- [ ] Histórico de laudos (localStorage)
- [ ] Atalhos de teclado (Ctrl+Enter)
- [ ] Presets por tipo de TC
- [ ] Detecção automática do tipo de exame
- [ ] Estatísticas de uso
- [ ] PWA para uso offline (com modelo local)
- [ ] Integração com Wispr via API (se disponível)

---

## 10. Notas de Desenvolvimento

- Templates são lidos em build time (getStaticProps) ou runtime
- Manter prompts versionados para rollback
- Testar HTML em TinyMCE antes de considerar etapa completa
- Priorizar estabilidade sobre features
