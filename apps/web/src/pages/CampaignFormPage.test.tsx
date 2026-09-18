import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { AthleteRecord, ScreeningCampaignData, ScreeningInstrumentData, SportsCatalogs } from '@socialapp/shared';
import { CampaignFormPage } from './CampaignFormPage';
import { loadAthletes, loadCatalogs } from '../features/athletes/athlete-repository';
import { loadCampaigns, loadInstruments, saveCampaignOffline } from '../features/work/work-repository';

vi.mock('../features/auth/useAuth', () => ({ useAuth: () => ({ user: { displayName: 'Trabajadora Social' } }) }));
vi.mock('../features/athletes/athlete-repository', () => ({ loadAthletes: vi.fn(), loadCatalogs: vi.fn() }));
vi.mock('../features/work/work-repository', () => ({ loadCampaigns: vi.fn(), loadInstruments: vi.fn(), saveCampaignOffline: vi.fn() }));

const athlete = {
  id: '11111111-1111-1111-1111-111111111111', internalCode: 'DEP-18', documentType: 'IDENTITY_CARD', documentNumber: '18',
  firstNames: 'María', lastNames: 'Mayor', birthDate: '2008-01-01', age: 18, sex: 'FEMALE', municipality: 'Medellín', zone: 'URBAN',
  sportsProgramId: '22222222-2222-2222-2222-222222222222', sportsProgramName: 'Formación', sportId: '33333333-3333-3333-3333-333333333333',
  sportName: 'Voleibol', categoryId: '44444444-4444-4444-4444-444444444444', categoryName: 'Juvenil', coachId: null, coachName: null,
  joinedAt: '2026-01-01', status: 'ACTIVE', schoolName: null, schoolGrade: null, schoolShift: null, currentlyEnrolled: true,
  guardian: { name: 'Acudiente', relationship: 'Madre', phone: '3000000000', email: null },
  hasSocialRecord: false, socialRecordUpdatedAt: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', version: 1,
} satisfies AthleteRecord;
const instrument = { id: '55555555-5555-5555-5555-555555555555', name: 'Tamizaje infantil', version: 1, ageGroup: '10 a 13 años', active: true, questions: [] } satisfies ScreeningInstrumentData;
const catalogs = { programs: [{ id: athlete.sportsProgramId, name: athlete.sportsProgramName }], sports: [{ id: athlete.sportId, name: athlete.sportName }], categories: [], coaches: [] } satisfies SportsCatalogs;

describe('CampaignFormPage age participation', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('allows adding an athlete outside the instrument recommended age', async () => {
    vi.mocked(loadAthletes).mockResolvedValue([athlete]);
    vi.mocked(loadCatalogs).mockResolvedValue(catalogs);
    vi.mocked(loadInstruments).mockResolvedValue([instrument]);
    vi.mocked(loadCampaigns).mockResolvedValue([]);
    vi.mocked(saveCampaignOffline).mockResolvedValue({} as ScreeningCampaignData);

    render(<MemoryRouter initialEntries={['/brigadas/nueva']}><Routes><Route path="/brigadas/nueva" element={<CampaignFormPage/>}/><Route path="/brigadas/:id" element={<div>Brigada guardada</div>}/></Routes></MemoryRouter>);
    expect(await screen.findByText('Participación abierta por edad.')).toBeInTheDocument();
    expect(screen.getByText(/18 años/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar brigada' }));

    await waitFor(() => expect(saveCampaignOffline).toHaveBeenCalledOnce());
    expect(vi.mocked(saveCampaignOffline).mock.calls[0]?.[0].athleteIds).toEqual([athlete.id]);
    expect(screen.queryByText(/no corresponde a la edad/i)).not.toBeInTheDocument();
  });
});
