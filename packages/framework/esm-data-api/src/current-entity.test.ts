import { beforeEach, describe, expect, it, vi } from 'vitest';
import { egenFetch, type FetchResponse } from '@egen/esm-api';
import { getSynchronizationItems } from '@egen/esm-offline';
import { fetchCurrentEntity } from './current-entity';

vi.mock('@egen/esm-api');

const mockEgenFetch = vi.mocked(egenFetch);
const mockGetSynchronizationItems = vi.mocked(getSynchronizationItems);

vi.mock('../egen-fetch', () => ({
  egenFetch: vi.fn(),
  fhirBaseUrl: '/ws/fhir2/R4',
}));

vi.mock('@egen/esm-offline', () => ({
  getSynchronizationItems: vi.fn(),
}));

describe('fetchEntityData', () => {
  beforeEach(() => {
    mockGetSynchronizationItems.mockResolvedValue([]);
  });

  it('should return null when entityUuid is falsy', async () => {
    const result = await fetchCurrentEntity('');
    expect(result).toBeNull();
  });

  it('should return online entity data when available', async () => {
    const mockEntity = { id: '123', name: [{ given: ['Alice'], family: 'Martin' }] };
    mockEgenFetch.mockResolvedValue({ data: mockEntity, ok: true } as Partial<FetchResponse> as FetchResponse);

    const result = await fetchCurrentEntity('123');
    expect(result).toEqual(mockEntity);
  });

  it('should return offline entity data when online fetch fails', async () => {
    const mockOfflineEntity = { id: '123', name: [{ given: ['Bob'], family: 'Dupont' }] };
    mockEgenFetch.mockRejectedValue(new Error('Network error'));
    mockGetSynchronizationItems.mockResolvedValue([{ fhirEntity: mockOfflineEntity }]);

    const result = await fetchCurrentEntity('123');
    expect(result).toEqual(mockOfflineEntity);
  });

  it('should throw an error when both online and offline fetches fail', async () => {
    mockEgenFetch.mockRejectedValue(new Error('Network error'));
    mockGetSynchronizationItems.mockResolvedValue([]);

    await expect(fetchCurrentEntity('123')).rejects.toThrow('Network error');
  });
});
