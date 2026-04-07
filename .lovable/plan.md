

## Barra de Progresso de Roteiros no Topbar

### O que muda
Substituir o badge de DNA (linhas 108-135) por uma barra de progresso compacta mostrando uso de roteiros vs limite do plano.

### Limites por plano (corrigido)
```text
basico:     10/mês
pro:        50/mês
enterprise: 200/mês
pastor:     30 roteiros total (scripts_restantes)
```

### Design
```text
┌──────────────────────────────────────────┐
│  ▎██████████░░░░░░░░░░▎  7 de 50        │
│  ▎   barra 4px        ▎  roteiros       │
└──────────────────────────────────────────┘
```
- Largura ~180px, barra 4px de altura, border-radius full
- Cor dinâmica: `#195FA5` (< 70%), `#f5c842` (70–90%), `#ff6b4a` (> 90%)
- Fundo barra: `#E4E4E0` (light) / `#2B2F3C` (dark)
- Label: "7 de 50 roteiros" (11px, muted) — plano pastor: "X restantes"
- Clicável → navega para `/perfil`

### Alterações em `src/components/AppTopbar.tsx`
1. Remover estado `dna`, `useEffect` de fetch do DNA, constantes `TONE_NAME` e `CONTEXTO_LABEL`
2. Adicionar constante `PLAN_LIMITS = { basico: 10, pro: 50, enterprise: 200, pastor: 30 }`
3. Substituir bloco center (linhas 108-135) pela barra de progresso usando `usuario.consultas_mes` e `usuario.plano`
4. Para plano `pastor`: usar `usuario.scripts_restantes` e mostrar "X restantes" com barra invertida (restantes/30)

### Campos do `usuarios` utilizados (já no AuthContext)
- `consultas_mes` — uso mensal (basico/pro/enterprise)
- `plano` — determina o limite
- `scripts_restantes` — apenas para pastor

Nota: `scripts_restantes` não está no tipo `UsuarioData` do AuthContext — preciso adicioná-lo.

### Arquivos alterados
- `src/contexts/AuthContext.tsx` — adicionar `scripts_restantes` ao tipo `UsuarioData`
- `src/components/AppTopbar.tsx` — substituir DNA badge pela barra de progresso

