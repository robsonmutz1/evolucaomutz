import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { GraduationCap, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import '@lovable.dev/cloud-auth-js/styles.css';

export const Route = createFileRoute('/auth')({
  head: () => ({ meta: [
    { title: 'Entrar · Evolução Mutz' },
    { name: 'description', content: 'Entre na sua conta da Evolução Mutz.' },
    { property: 'og:title', content: 'Entrar · Evolução Mutz' },
    { property: 'og:description', content: 'Acesso à conta de gestão da Evolução Mutz.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Auth,
});

function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const router = useRouter();
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: '/dashboard', replace: true });
    });
  }, [navigate]);
  async function finish() {
    await router.invalidate();
    await navigate({ to: '/dashboard', replace: true });
  }
  async function social(provider: 'google' | 'lovable') {
    setBusy(true); setMessage('');
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth` });
      if (result.error) { setMessage('Não foi possível entrar. Tente novamente.'); return; }
      if (!result.redirected) await finish();
    } catch { setMessage('Não foi possível entrar. Tente novamente.'); }
    finally { setBusy(false); }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        setMessage(error ? 'Não foi possível enviar o e-mail. Tente novamente.' : 'Se a conta existir, você receberá o link para redefinir a senha.');
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth` } });
        if (error) setMessage(error.code === 'weak_password' || error.message.includes('weak')
          ? 'Essa senha é conhecida por ser insegura. Escolha uma senha diferente, longa e exclusiva.'
          : 'Não foi possível criar a conta. Verifique os dados e tente novamente.');
        else if (data.session) await finish();
        else setMessage('Confira seu e-mail para confirmar a conta. O acesso à escola depende de autorização.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMessage('Não foi possível entrar. Confira o e-mail, a senha e a confirmação da conta.');
        else await finish();
      }
    } catch { setMessage('Não foi possível concluir. Tente novamente.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-12">
    <GraduationCap className="h-10 w-10 text-primary" />
    <div><h1 className="text-3xl font-semibold">Evolução Mutz</h1><p className="mt-2 text-muted-foreground">{mode === 'signup' ? 'Criar conta' : mode === 'reset' ? 'Recuperar senha' : 'Acesso à gestão escolar'}</p></div>
    <form className="space-y-4" onSubmit={submit}>
      <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
      {mode !== 'reset' && <div className="space-y-2"><Label htmlFor="password">Senha</Label><Input id="password" type="password" minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required /></div>}
      <Button className="w-full" disabled={busy} type="submit"><LogIn />{busy ? 'Aguarde…' : mode === 'signup' ? 'Criar conta' : mode === 'reset' ? 'Enviar link' : 'Entrar'}</Button>
    </form>
    {message && <p role="status" className="text-sm text-foreground">{message}</p>}
    {mode !== 'reset' && <div className="space-y-3"><Button className="w-full" variant="outline" disabled={busy} onClick={() => social('google')}>Continuar com Google</Button><Button className="lovable-auth-button w-full" disabled={busy} onClick={() => social('lovable')}>Continue with Lovable</Button></div>}
    <div className="flex flex-wrap gap-2"><Button variant="link" disabled={busy} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }}>{mode === 'login' ? 'Criar conta' : 'Voltar para entrar'}</Button>{mode === 'login' && <Button variant="link" disabled={busy} onClick={() => { setMode('reset'); setMessage(''); }}>Esqueci a senha</Button>}</div>
  </main>;
}