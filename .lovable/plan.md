

## Plano: Modal de detalhe do cliente no CRM (inline, sem navegar)

### O que muda

Ao clicar em um card do pipeline (ou da lista), em vez de navegar para `/crm/${id}`, abre um **Dialog/modal** sobre o pipeline com um resumo do cliente — igual aos screenshots de referencia.

### Layout do modal

```text
┌─────────────────────────────────────────────────────────────┐
│  [A] Ari Souza                                 🔥 Quente  X │
│      Marketing Digital · Score 88/100                       │
├──────────────────────────┬──────────────────────────────────┤
│  CONTATO                 │  ÚLTIMA SESSÃO                   │
│  💬 (11) 98888-0002      │  📋 Reunião · Marketing Digital  │
│  📧 ari@agencia.com      │               Score 88/100       │
│                          │  [Roteiro ✓][Proposta ✓][E-mail ✓│
│  PIPELINE                │  ][WhatsApp +][Objeções ✓]       │
│  📍 Proposta Enviada      │                                  │
│  ⏱ há 4 dias             │  [Ver roteiro →] [+ Nova sessão] │
│  📅 Criado há 5 dias      │                                  │
│                          ├──────────────────────────────────┤
│  AÇÕES RÁPIDAS           │  ATIVIDADE          [+ Registrar]│
│  [📋 Registrar contato]  │  🛡 Objeções geradas    há 3 dias │
│  [✏️ Editar]              │  📧 E-mail de follow-up  há 3 dias│
│                          │  📄 Proposta comercial   há 4 dias│
│                          │  📋 Roteiro gerado       há 4 dias│
└──────────────────────────┴──────────────────────────────────┘
```

### Mudanças por arquivo

**1. `src/pages/CRM.tsx`**

- Adicionar estado `clienteSelecionado: Cliente | null`
- Ao clicar em PipelineCard ou ListClienteCard, setar `clienteSelecionado` em vez de `navigate(/crm/id)`
- Criar componente `ClienteQuickViewModal` renderizado no CRM com Dialog
- O modal busca dados detalhados via `svpApi.buscarCliente(id)` ao abrir (sessoes, interacoes)
- Seções do modal:
  - **Header**: avatar + nome + subtitulo (empresa · score da ultima sessao) + badge temperatura + botao fechar
  - **Coluna esquerda**: CONTATO (whatsapp, email), PIPELINE (status mapeado, aging, data criacao), ACOES RAPIDAS (Registrar contato → abre NovaInteracaoModal, Editar → navega para /crm/id)
  - **Coluna direita superior**: ULTIMA SESSAO — info da sessao + badges de pecas (verde=gerada, cinza=gerar) clicaveis para gerar via `svpApi.gerarPeca` + botoes "Ver roteiro" e "+ Nova sessao"
  - **Coluna direita inferior**: ATIVIDADE — timeline das ultimas interacoes + botao "+ Registrar"
- Badges de pecas: mesma logica do PipelineCard (estado local, loading inline, gerar on-demand)
- Botao "Editar" navega para `/crm/${id}` (pagina completa existente)
- Botao "Ver roteiro" navega para `/roteiro/${sessao.id}`

**2. Nao alterar**

- Pagina `/crm/${id}` (CRMCliente.tsx) — continua existindo para edicao completa
- APIs, edge functions, tipos
- Fluxo de geracao de roteiro e pecas

### Detalhe tecnico

- O modal usa `Dialog` do shadcn com `sm:max-w-[700px]`
- Score vem de `sessao.roteiro_json?.score`
- Interacoes ordenadas por `criado_em` desc, limitar a ~5 ultimas no modal
- Ao gerar peca com sucesso no modal, atualizar estado local dos badges (sem reload)

