import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const Route = createFileRoute('/reset-password')({
  head: () => ({ meta: [
    { title: 'Redefinir senha · Evolução Mutz' },
    { name: 'description', content: 'Redefina sua senha de acesso à Evolução Mutz.' },
    { property: 'og:title', content: 'Redefinir senha · Evolução Mutz' },
    { property: 'og:description', content: 'Recuperação de acesso à sua conta Evolução Mutz.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }), component: ResetPassword,
});
function ResetPassword() {
  const [recovery, setRecovery] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { setRecovery(new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery'); }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setMessage('As senhas precisam ser iguais.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      setMessage(error ? 'Link inválido ou expirado. Solicite um novo link.' : 'Senha atualizada. Você já pode entrar.');
    } catch { setMessage('Não foi possível atualizar a senha. Tente novamente.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 p-6"><h1 className="text-3xl font-semibold">Redefinir senha</h1>
    {recovery ? <form onSubmit={submit} className="space-y-4"><Label htmlFor="new-password">Nova senha</Label><Input id="new-password" type="password" minLength={8} required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /><Label htmlFor="confirm-password">Confirmar senha</Label><Input id="confirm-password" type="password" minLength={8} required autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} /><Button disabled={busy} type="submit">{busy ? 'Aguarde…' : 'Salvar senha'}</Button></form> : <p className="text-muted-foreground">Abra o link de recuperação enviado ao seu e-mail.</p>}
    {message && <p role="status">{message}</p>}<Link to="/auth" className="text-primary underline">Voltar para entrar</Link>
  </main>;
}