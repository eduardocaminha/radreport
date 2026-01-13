# Índice de Templates

## Máscaras Disponíveis

| Arquivo | Tipo | Contraste | Status |
|---------|------|-----------|--------|
| `mascaras/tc-abdome-sem-contraste.md` | TC Abdome | Sem | ✅ Pronto |
| `mascaras/tc-abdome-com-contraste.md` | TC Abdome | Com | ✅ Pronto |
| `mascaras/tc-cranio-sem-contraste.md` | TC Crânio | Sem | ⏳ Pendente |
| `mascaras/tc-cranio-com-contraste.md` | TC Crânio | Com | ⏳ Pendente |
| `mascaras/tc-torax-sem-contraste.md` | TC Tórax | Sem | ⏳ Pendente |
| `mascaras/tc-torax-com-contraste.md` | TC Tórax | Com | ⏳ Pendente |
| `mascaras/tc-coluna-cervical.md` | TC Coluna | Sem | ⏳ Pendente |
| `mascaras/tc-coluna-lombar.md` | TC Coluna | Sem | ⏳ Pendente |
| `mascaras/tc-seios-face.md` | TC Seios da Face | Sem | ⏳ Pendente |

---

## Achados por Região

### Rim (`achados/rim/`)

| Arquivo | Palavras-chave | Status |
|---------|----------------|--------|
| `microcalculo.md` | microcalculo, microlitiase | ✅ Pronto |
| `cisto-simples.md` | cisto renal, cisto simples | ✅ Pronto |
| `calculo-obstrutivo.md` | calculo obstrutivo, hidronefrose | ⏳ Pendente |
| `cisto-bosniak.md` | cisto complexo, bosniak | ⏳ Pendente |
| `nefrolitiase-multipla.md` | multiplos calculos | ⏳ Pendente |

### Apêndice (`achados/apendice/`)

| Arquivo | Palavras-chave | Status |
|---------|----------------|--------|
| `apendicite-aguda.md` | apendicite, apendice inflamado | ✅ Pronto |
| `apendicite-complicada.md` | apendicite perfurada, abscesso | ⏳ Pendente |

### Fígado (`achados/figado/`)

| Arquivo | Palavras-chave | Status |
|---------|----------------|--------|
| `esteatose.md` | esteatose, figado gorduroso | ⏳ Pendente |
| `cisto-simples.md` | cisto hepatico | ⏳ Pendente |
| `hemangioma.md` | hemangioma | ⏳ Pendente |
| `nodulo-indeterminado.md` | nodulo hepatico | ⏳ Pendente |

### Vesícula (`achados/vesicula/`)

| Arquivo | Palavras-chave | Status |
|---------|----------------|--------|
| `colelitiase.md` | calculo vesicula, pedra vesicula | ⏳ Pendente |
| `colecistite.md` | colecistite, vesicula inflamada | ⏳ Pendente |

### Baço (`achados/baco/`)

| Arquivo | Palavras-chave | Status |
|---------|----------------|--------|
| `esplenomegalia.md` | baco aumentado, esplenomegalia | ⏳ Pendente |

### Pâncreas (`achados/pancreas/`)

| Arquivo | Palavras-chave | Status |
|---------|----------------|--------|
| `pancreatite-aguda.md` | pancreatite | ⏳ Pendente |

### Crânio (`achados/cranio/`)

| Arquivo | Palavras-chave | Status |
|---------|----------------|--------|
| `avc-isquemico.md` | avc, isquemia | ⏳ Pendente |
| `hemorragia-intraparenquimatosa.md` | hemorragia, sangramento | ⏳ Pendente |
| `hematoma-subdural.md` | hematoma subdural | ⏳ Pendente |

### Tórax (`achados/torax/`)

| Arquivo | Palavras-chave | Status |
|---------|----------------|--------|
| `nodulo-pulmonar.md` | nodulo pulmonar | ⏳ Pendente |
| `derrame-pleural.md` | derrame pleural | ⏳ Pendente |
| `pneumonia.md` | pneumonia, consolidacao | ⏳ Pendente |

### Coluna (`achados/coluna/`)

| Arquivo | Palavras-chave | Status |
|---------|----------------|--------|
| `hernia-discal.md` | hernia, protrusao | ⏳ Pendente |
| `fratura-vertebral.md` | fratura vertebra | ⏳ Pendente |

---

## Placeholders Disponíveis

| Placeholder | Uso | Exemplo |
|-------------|-----|---------|
| `{{medida}}` | Tamanho (sempre cm, 1 casa decimal) | 1,1 cm |
| `{{lado}}` | Lateralidade | à direita, à esquerda, bilateral |
| `{{localizacao}}` | Posição específica | no polo superior, no terço médio |
| `{{contagem}}` | Quantidade | único, dois, múltiplos |
| `{{segmento}}` | Segmento anatômico | no segmento VI, no lobo inferior |

---

## Como Adicionar Novos Templates

### Nova Máscara

1. Criar arquivo em `mascaras/` com nome `tc-[regiao]-[contraste].md`
2. Adicionar frontmatter com tipo, contraste, urgencia
3. Usar comentários `<!-- REGIAO:nome -->` para delimitar regiões substituíveis
4. Atualizar este INDEX.md

### Novo Achado

1. Criar arquivo em `achados/[orgao]/` com nome descritivo
2. Adicionar frontmatter com regiao, palavras_chave, requer, opcional
3. Usar placeholders `{{nome}}` para valores variáveis
4. Atualizar este INDEX.md
