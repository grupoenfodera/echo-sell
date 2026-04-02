import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import type { GerarRoteiroPayload } from '@/types/crm';

interface FormularioGeracaoProps {
  onSubmit: (payload: GerarRoteiroPayload) => void;
  loading: boolean;
  error: string | null;
}

export function FormularioGeracao({ onSubmit, loading, error }: FormularioGeracaoProps) {
  const [nomeCliente, setNomeCliente] = useState('');
  const [nicho, setNicho] = useState('');
  const [produto, setProduto] = useState('');
  const [preco, setPreco] = useState('');
  const [contextoGeracao, setContextoGeracao] = useState<'b2b' | 'b2c'>('b2b');
  const [cargo, setCargo] = useState('');
  const [dorPrincipal, setDorPrincipal] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: GerarRoteiroPayload = {
      nicho,
      produto,
      contextoGeracao,
      ...(nomeCliente && { nome_cliente: nomeCliente }),
      ...(preco && { preco: Number(preco) }),
      ...((cargo || dorPrincipal) && {
        dados_extras: {
          ...(cargo && { cargo }),
          ...(dorPrincipal && { dor_principal: dorPrincipal }),
        },
      }),
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="nome_cliente">Nome do cliente</Label>
        <Input
          id="nome_cliente"
          placeholder="Ex: João Silva"
          value={nomeCliente}
          onChange={e => setNomeCliente(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nicho">
          Nicho / Segmento <span className="text-destructive">*</span>
        </Label>
        <Input
          id="nicho"
          placeholder="Ex: Clínicas de estética, Escritórios de advocacia..."
          value={nicho}
          onChange={e => setNicho(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="produto">
          Produto ou Serviço <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="produto"
          placeholder="Descreva o que você vende e seus diferenciais"
          value={produto}
          onChange={e => setProduto(e.target.value)}
          required
          disabled={loading}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="preco">Preço (R$)</Label>
          <Input
            id="preco"
            type="number"
            placeholder="Ex: 1500"
            value={preco}
            onChange={e => setPreco(e.target.value)}
            disabled={loading}
            min={0}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contexto">Contexto de Venda</Label>
          <Select
            value={contextoGeracao}
            onValueChange={v => setContextoGeracao(v as 'b2b' | 'b2c')}
            disabled={loading}
          >
            <SelectTrigger id="contexto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="b2b">B2B — Empresa para Empresa</SelectItem>
              <SelectItem value="b2c">B2C — Empresa para Pessoa Física</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cargo">Cargo do decisor</Label>
        <Input
          id="cargo"
          placeholder="Ex: Diretor Comercial, Sócio..."
          value={cargo}
          onChange={e => setCargo(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dor">Principal dor ou problema do cliente</Label>
        <Textarea
          id="dor"
          placeholder="Descreva a principal dor ou problema que seu cliente enfrenta"
          value={dorPrincipal}
          onChange={e => setDorPrincipal(e.target.value)}
          disabled={loading}
          rows={2}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Gerando roteiro...
          </>
        ) : (
          <>
            Gerar Roteiro <Sparkles className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
