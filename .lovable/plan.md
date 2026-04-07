

## Plano: Product Tour Modal (5 slides) — Revisado

### Arquivos

**1. Novo: `src/components/ProductTourModal.tsx`**

Modal fullscreen com 5 slides animados (conforme especificado anteriormente — sem alterações nesta parte).

- Overlay: `fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm`
- Card: `bg-card border border-border rounded-2xl max-w-lg p-8`
- 5 slides com `AnimatePresence` + slide horizontal via framer-motion
- Stepper: 5 bolinhas (ativa `bg-primary`, inativa `bg-muted`)
- Props: `onComplete: (action: 'configure' | 'explore') => void`
- Slides 1-5 conforme spec original (Boas-vindas, Gerar Roteiros, Funcionalidades, CRM, DNA Comercial)
- "Pular tour" no canto superior direito → `onComplete('configure')`

**2. Editar: `src/App.tsx` — ProtectedRoute**

Lógica corrigida com sessionStorage + refreshUsuario:

```typescript
const { session, loading, usuario, refreshUsuario } = useAuth();

const [showProductTour, setShowProductTour] = useState(
  () => sessionStorage.getItem('svp_tour_done') !== '1'
);

const handleTourComplete = async (action: 'configure' | 'explore') => {
  sessionStorage.setItem('svp_tour_done', '1');
  setShowProductTour(false);

  if (action === 'explore' && usuario?.id) {
    await supabase.from('usuarios').update({ primeiro_acesso: false }).eq('id', usuario.id);
    await refreshUsuario(); // sincroniza estado em memória
    navigate('/');
  }
  // action === 'configure' → showProductTour=false permite redirect normal para /bem-vindo
};

// No render:
if (usuario?.primeiro_acesso && showProductTour && !skipRedirectPaths.includes(location.pathname)) {
  return <ProductTourModal onComplete={handleTourComplete} />;
}
// Depois: redirect normal para /bem-vindo se primeiro_acesso === true
```

### O que NÃO muda
- Welcome.tsx, Onboarding.tsx, AuthContext, rotas, lógica de DNA, campo `primeiro_acesso`

