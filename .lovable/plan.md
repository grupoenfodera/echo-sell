

## Análise Heurística de Nielsen — CRM Pipeline

Após revisão completa do código do CRM (`CRM.tsx`, `ClienteQuickViewModal.tsx`), identifiquei 3 problemas críticos de usabilidade:

---

### Problema 1 — Falta de feedback e visibilidade do status (Heurística #1: Visibilidade do status do sistema)

**Onde**: PipelineCard e modal de detalhe

**Sintomas**:
- Ao arrastar um card entre colunas, o update é otimista mas não há indicador visual de "salvando" — se falhar, o card volta silenciosamente sem o usuário entender o que houve
- Ao gerar uma peça (Proposta, E-mail, etc.), o único feedback é um spinner minúsculo de 12px dentro do chip — quase invisível
- Não há estado de "sucesso visual" nos chips após gerar — o chip muda de cinza para verde sem animação ou destaque temporário

**Melhorias propostas**:
- Adicionar um toast ou micro-animação de confirmação no card após drag-and-drop bem-sucedido (pulse na borda da coluna destino)
- Aumentar a área de feedback durante geração de peça: substituir o chip por um skeleton/shimmer de largura equivalente
- Adicionar animação de "pop" (scale 1.0→1.1→1.0) no chip ao mudar de pendente para gerado, criando satisfação visual

---

### Problema 2 — Área de toque ambígua e prevenção de erros fraca (Heurísticas #5 e #7: Prevenção de erros + Flexibilidade)

**Onde**: PipelineCard — botões e drag-and-drop

**Sintomas**:
- O drag handle é o **avatar** (círculo de 28x28px) — área muito pequena para toque mobile e sem affordance visual (sem ícone de grip, apenas as iniciais do nome)
- O card inteiro é `cursor-pointer` e clicável para abrir o modal, mas internamente tem um botão de ação ("Continuar", "Ver roteiro") que também é clicável — não há separação visual clara entre "clicar no card" e "clicar no botão"
- Chips de peças pendentes no modal disparam geração com um único clique, sem confirmação — o usuário pode gerar uma peça acidentalmente

**Melhorias propostas**:
- Adicionar um ícone `GripVertical` (6 dots) visível ao lado do avatar como affordance de drag, com tooltip "Arraste para mover"
- Separar visualmente a área do botão primário do corpo do card com uma borda superior sutil (`border-top: 1px solid border`) para criar duas zonas claras
- Nos chips de peça pendente ("+"), adicionar um popover de confirmação leve ("Gerar proposta para este cliente?") antes de disparar a chamada API

---

### Problema 3 — Sobrecarga cognitiva e falta de hierarquia na informação (Heurística #8: Design estético e minimalista)

**Onde**: PipelineCard e colunas do Kanban

**Sintomas**:
- Cada card exibe simultaneamente: avatar, nome, empresa, badge de temperatura, 5 dots de progresso, aging indicator e botão de ação — são 7 elementos visuais competindo em um espaço de ~280x160px
- Os 5 dots de progresso não têm labels nem tooltips — são círculos roxos/cinzas sem contexto. O usuário precisa decorar a ordem (Roteiro, Proposta, E-mail, WhatsApp, Objeções)
- A coluna "Fechado" mistura ganhos e perdidos sem separação visual forte — o badge "✅ Ganho" / "❌ Perdido" tem o mesmo peso visual

**Melhorias propostas**:
- Adicionar tooltips nos 5 dots de progresso mostrando o nome da peça ("Roteiro ✓", "Proposta — pendente") ao hover
- Substituir os 5 dots por uma mini progress bar (barra horizontal com segmentos) que ocupa menos espaço vertical e comunica progresso de forma mais intuitiva
- Na coluna "Fechado", agrupar visualmente ganhos e perdidos com sub-headers ou separar com background diferente (ganhos com tint verde sutil, perdidos com tint vermelho sutil)

---

### Resumo das Implementações

| Arquivo | Mudança |
|---|---|
| `src/pages/CRM.tsx` — `PipelineCard` | Adicionar ícone GripVertical como affordance de drag; tooltips nos dots de progresso; separador visual antes do botão de ação; sub-agrupamento na coluna Fechado |
| `src/pages/CRM.tsx` — `handleDragEnd` | Adicionar indicador visual de loading durante o save do drag |
| `src/components/crm/ClienteQuickViewModal.tsx` | Adicionar popover de confirmação antes de gerar peça; animação de sucesso nos chips |

### Escopo
- Apenas alterações visuais e de interação no frontend
- Nenhuma Edge Function criada ou modificada
- Nenhum deploy no Supabase

