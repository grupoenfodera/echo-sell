

## Plano: Substituir texto "SVP" pela logo no Header

### O que muda

1. Copiar a imagem `user-uploads://2SVP_-_TBranco.png` para `src/assets/logo-svp.png`
2. Em `src/components/Header.tsx`, importar a imagem e substituir o `<span>SVP</span>` por um `<img>` com altura adequada (~24px) para caber no header de 54px

### Detalhe técnico

- A logo é branca sobre fundo transparente, ideal para o tema dark. Para o tema light, pode precisar de uma versão escura futuramente, mas por ora será usada como está.
- O `<img>` terá `className="h-6"` e `alt="Método SVP"`.

