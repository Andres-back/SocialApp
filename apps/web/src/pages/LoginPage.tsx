import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, WifiOff } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '../features/auth/useAuth';
import { useConnection } from '../hooks/useConnection';

const credentialsSchema = z.object({ email: z.string().email('Escribe un correo válido.'), password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.') });

export function LoginPage() {
  const { login } = useAuth();
  const online = useConnection();
  const [email, setEmail] = useState('trabajo.social@demo.local');
  const [password, setPassword] = useState('SocialApp2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Revisa los datos.');
    if (!online) return setError('Necesitas conexión para iniciar sesión por primera vez.');
    setSubmitting(true);
    try { await login(email, password); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible iniciar sesión.'); }
    finally { setSubmitting(false); }
  }

  return (
    <main className="grid min-h-screen bg-sand-50 lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative hidden overflow-hidden bg-pine-800 p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border-[70px] border-white/5" />
        <div className="absolute -bottom-40 left-24 h-[520px] w-[520px] rounded-full bg-pine-700/50" />
        <div className="relative flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-coral-500 text-xl font-bold">S</div><span className="font-display text-2xl">SocialApp</span></div>
        <div className="relative max-w-xl">
          <p className="mb-5 inline-flex rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[.18em] text-pine-100">Organización que acompaña</p>
          <h1 className="font-display text-5xl leading-[1.08] xl:text-6xl">Tu trabajo en campo, claro y siempre a la mano.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-pine-100">Consulta, registra y continúa tu jornada incluso cuando no haya internet. Los cambios se sincronizan al volver la conexión.</p>
        </div>
        <p className="relative text-sm text-pine-100">Información protegida · Acceso institucional</p>
      </section>

      <section className="flex items-center justify-center p-5 md:p-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-pine-800 font-bold text-white">S</div><span className="font-display text-2xl text-pine-900">SocialApp</span></div>
          <p className="text-sm font-semibold text-coral-600">Bienvenida de nuevo</p>
          <h2 className="mt-2 font-display text-4xl text-pine-900">Ingresa a tu espacio</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">Usa las credenciales asignadas por tu institución.</p>
          {!online && <div className="mt-5 flex gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800"><WifiOff className="shrink-0" size={20} /><span>Sin conexión. Si ya tenías una sesión abierta, puedes continuar desde ese dispositivo.</span></div>}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Correo institucional</span><input className="field" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Contraseña</span><span className="relative block"><input className="field pr-12" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-500" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></span></label>
            {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <button className="btn-primary w-full" disabled={submitting}><LockKeyhole size={19} />{submitting ? 'Verificando…' : 'Ingresar de forma segura'}</button>
          </form>
          <p className="mt-8 text-center text-xs leading-5 text-slate-400">Esta herramienta apoya la organización de Trabajo Social. No realiza diagnósticos clínicos.</p>
        </div>
      </section>
    </main>
  );
}

