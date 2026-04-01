

## Fix: Error handling for `supabase.functions.invoke("gerar")`

### Problem
When the edge function returns HTTP 402/403, the Supabase SDK puts the response body in `data` and sets `error = null`. The current code checks `error` first, finds nothing, then checks `data?.error` — but the SDK may parse the JSON response differently for non-2xx status codes, causing the error to slip through silently.

### Change — `src/pages/Dashboard.tsx` (lines 57-75)

Replace the current invoke + error check block with a unified pattern:

```typescript
const { data, error } = await supabase.functions.invoke('gerar', {
  body: {
    ...formData,
    _modalidade: modality,
    contexto_geracao: contextoGeracao || (dna?.contexto !== 'ambos' ? dna?.contexto : null),
  },
});

// Unified error check: SDK error OR edge function JSON error
const errorMessage = error?.message || data?.error || null;
if (errorMessage) {
  toast.error(errorMessage);
  setLoading(false);
  return;
}

setResult(data as SvpResult);
```

This removes the `throw` / `try-catch` approach for expected business errors (quota, access) and handles them inline before setting the result. The outer `try-catch` still handles unexpected network/runtime errors.

### Files
| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Replace lines 66-75 with unified `errorMessage` check pattern |

