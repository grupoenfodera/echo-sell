

## Plano: Adicionar Produto, Ticket e Data de Criação nos Cards do CRM

### Resumo
Adicionar 3 informações nos cards do pipeline: data de criação do lead, ticket médio (preço) e nome do produto. Requer uma mudança mínima na edge function para trazer `produto` e `preco` da sessão.

### Mudanças

**1. Edge Function `crm-listar/index.ts`** (mudança mínima)
- Linha 136: adicionar `produto, preco` ao select da query de sessões
- Linhas 145-154: incluir `produto` e `preco` no objeto `ultimasSessoes`

**2. Tipo `UltimaSessao` em `src/types/crm.ts`**
- Adicionar `produto?: string` e `preco?: number`

**3. Cards em `src/pages/CRM.tsx`**
- `PipelineCard`: adicionar abaixo do nome/empresa:
  - Produto como tag/badge sutil (se existir)
  - Ticket formatado em BRL: "R$ 2.500" (font-semibold, cor primária)
  - Data de criação relativa ("há 3 dias") no rodapé do card
- `ListClienteCard`: mesmas 3 informações para consistência

### Layout do card atualizado
```text
┌──────────────────────────────┐
│ 👤 João Silva        [Morno] │
│    Empresa X                 │
│    📦 Mentoria Premium       │
│    💰 R$ 2.500               │
│ ▓▓▓▓░░░░░░  3/5             │
│              criado há 3 dias│
└──────────────────────────────┘
```

### Arquivos alterados
1. `supabase/functions/crm-listar/index.ts` — adicionar 2 campos ao select + mapeamento
2. `src/types/crm.ts` — adicionar `produto?` e `preco?` ao tipo `UltimaSessao`
3. `src/pages/CRM.tsx` — exibir as 3 novas informações nos cards

