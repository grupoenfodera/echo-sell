

## Plano: Ajustar CTAs dos cards do CRM

### Lógica atual (linhas 571-579)
O botão primário varia entre 4 labels: "Gerar roteiro", "Registrar contato", "Continuar" e "Ver roteiro".

### Nova lógica
- **Sem sessão** → manter `"Gerar roteiro"` (inalterado)
- **Com sessão (qualquer estado)** → `"Ver Roteiro"`

### Alteração em `src/pages/CRM.tsx` (linhas 571-579)

```typescript
let primaryAction = { label: 'Gerar roteiro', action: () => navigate('/') };
if (sessao) {
  if (todasGeradas) {
    primaryAction = { label: 'Ver Roteiro', action: () => navigate(`/crm/${cliente.id}`) };
  } else if (temRoteiro && totalPecas > 0 && totalPecas < 4) {
    primaryAction = { label: 'Ver Roteiro', action: () => navigate(`/roteiro/${sessao.id}`) };
  } else if (temRoteiro) {
    primaryAction = { label: 'Ver Roteiro', action: () => navigate(`/roteiro/${sessao.id}`) };
  } else {
    primaryAction = { label: 'Ver Roteiro', action: () => navigate(`/roteiro/${sessao.id}`) };
  }
}
```

Resumo: cards sem roteiro criado mantêm "Gerar roteiro"; todos os demais exibem "Ver Roteiro", preservando a navegação original de cada caso.

