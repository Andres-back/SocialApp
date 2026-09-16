import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LoginPage } from './LoginPage';
import { useAuth } from '../features/auth/useAuth';
import { ReplicaSwitchRequiredError } from '../features/auth/replica-session';

vi.mock('../features/auth/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/useConnection', () => ({ useConnection: () => true }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('safe switch login', () => {
  it('offers explicit confirmation after synchronization', async () => {
    const login = vi.fn().mockRejectedValueOnce(new ReplicaSwitchRequiredError(0, 2, 'previous@example.com')).mockResolvedValueOnce(undefined);
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, login, logout: vi.fn(), can: () => false });
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar de forma segura' }));
    const confirm = await screen.findByRole('button', { name: 'Cambiar de cuenta conservando los datos' });
    expect(screen.getByText(/Se conservan 2 borradores/)).toBeInTheDocument();
    await act(async () => { fireEvent.click(confirm); });
    expect(login).toHaveBeenLastCalledWith('trabajo.social@demo.local', 'SocialApp2026!', true);
  });

  it('requires the original account when changes are pending', async () => {
    const login = vi.fn().mockRejectedValue(new ReplicaSwitchRequiredError(3, 1, 'previous@example.com'));
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, login, logout: vi.fn(), can: () => false });
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar de forma segura' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Volver a la cuenta anterior' }));
    expect(screen.getByLabelText('Correo institucional')).toHaveValue('previous@example.com');
    expect(screen.getByLabelText('Contraseña')).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Cambiar de cuenta conservando los datos' })).not.toBeInTheDocument();
  });
});
