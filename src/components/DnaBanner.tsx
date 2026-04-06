import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const DnaBanner = () => {
  const { usuario } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [hasDna, setHasDna] = useState(true);

  useEffect(() => {
    if (!usuario?.id) return;
    supabase
      .from('usuario_dna')
      .select('id')
      .eq('usuario_id', usuario.id)
      .maybeSingle()
      .then(({ data }) => setHasDna(!!data));
  }, [usuario?.id]);

  if (hasDna || dismissed) return null;

  return (
    <div className="fixed top-[52px] left-[192px] right-0 z-40 bg-[hsl(33_100%_57%/0.1)] border-b border-[hsl(var(--warn))] px-4 py-2.5 flex items-center justify-between no-print">
      <div className="flex items-center gap-2 text-[hsl(var(--warn))]">
        <Settings className="h-3.5 w-3.5 shrink-0" />
        <p className="text-xs font-ui">
          Configure seu DNA Comercial para personalizar os scripts.{' '}
          <Link to="/dna-comercial" className="underline hover:no-underline font-semibold">
            Configurar agora →
          </Link>
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-[hsl(var(--warn))] hover:text-foreground transition-colors shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default DnaBanner;
