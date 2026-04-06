

## Correções visuais no modal ClienteQuickViewModal

### Arquivo: `src/components/crm/ClienteQuickViewModal.tsx`

**1. Seção "Última sessão" — redesenhar como card de metadados**
- Remover o bloco atual (linhas 215-225) que renderiza produto/nicho inline com ícone
- Substituir por um card com `border-left: 3px solid #7c5cfc` contendo:
  - Linha 1: label "ÚLTIMA SESSÃO" (10px, uppercase, `#5a5a7a`) + data da sessão à direita (12px, `#9090b0`)
  - Linha 2: `sessao.nicho` (13px, bold, `#e8e8f0`)
  - Linha 3: `sessao.produto` (12px, `#9090b0`, truncate)
  - Linha 4: Badge pill "Score X/100" (roxo `#7c5cfc`)
- Separador entre o card e os chips de peças
- Chips de peças: verde gerado (`#34d399` tons), cinza pendente (`#2a2a3a`/`#5a5a7a`/`#3a3a52`)
- Estado vazio: "Nenhuma sessão registrada" + botão centralizado

**2. Score — remover do header**
- Linha 139-141: remover `score` da subtítulo do header. Mostrar apenas `cliente.empresa` ou `cliente.nicho` (sem score).

**3. Header — subtítulo com nicho/empresa**
- Substituir a linha de subtítulo por: `cliente.nicho ?? cliente.empresa` (se existir), com `font-size: 12px, color: #9090b0`

**4. Avatar — cor dinâmica por temperatura**
- Criar mapa de cores por temperatura: `ativo`→`#ff6b4a`, `morno`→`#f5c842`, `frio`→`#4a9eff`, fallback→`#9090b0`
- Aplicar `style={{ background, color }}` no div do avatar (linha 134) em vez de `bg-primary/10`

**5. Modal — largura**
- DialogContent: `sm:min-w-[720px] sm:max-w-[860px]` (linha 132)

