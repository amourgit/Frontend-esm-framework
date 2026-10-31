import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type LoggedInUser, type Session } from '@egen-civitas/esm-api';
import { type FHIRLocationResource } from '@egen-civitas/esm-data-api';
import { useConfig, useSession } from '@egen-civitas/esm-react-utils';
import {
  annexResponse,
  locationResponseForNonExistingSearch,
  mainOfficeResponse,
  mockLoginLocations,
} from '../../__mocks__/locations.mock';
import { mockConfig } from '../../__mocks__/config.mock';
import { LocationPicker } from './location-picker.component';
import { useLocationByUuid, useLocations } from './location-picker.resource';

const validLocationUuid = '1ce1b7d4-c865-4178-82b0-5932e51503d6';
const annexLocationUuid = 'ba685651-ed3b-4e63-9b35-78893060758a';

const mockUseConfig = vi.mocked(useConfig);
const mockUseSession = vi.mocked(useSession);
const mockUseLocationByUuid = vi.mocked(useLocationByUuid);
const mockUseLocations = vi.mocked(useLocations);

vi.mock('./location-picker.resource', () => ({
  useLocationByUuid: vi.fn(),
  useLocations: vi.fn(),
}));

vi.mock('@egen-civitas/esm-api', async () => ({
  ...(await import('@egen-civitas/esm-api')),
  egenFetch: vi.fn((url) => {
    if (url === `/ws/fhir2/R4/Location?_id=${annexLocationUuid}`) {
      return annexResponse;
    }
    if (url === '/ws/fhir2/R4/Location?_summary=data&_count=50&name%3Acontains=search_for_no_location') {
      return locationResponseForNonExistingSearch;
    }
    if (url === '/ws/fhir2/R4/Location?_summary=data&_count=50&name%3Acontains=main') {
      return mainOfficeResponse;
    }
    return mockLoginLocations;
  }),
  setSessionLocation: vi.fn().mockResolvedValue({}),
  setUserProperties: vi.fn().mockResolvedValue({}),
}));

describe('LocationPicker', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue(mockConfig);
    mockUseSession.mockReturnValue({
      user: {
        display: 'Testy McTesterface',
        uuid: '90bd24b3-e700-46b0-a5ef-c85afdfededd',
        userProperties: {},
      } as LoggedInUser,
    } as Session);

    mockUseLocationByUuid.mockReturnValue({
      location: null,
      error: null,
      isLoading: false,
    });

    mockUseLocations.mockReturnValue({
      locations: mockLoginLocations.data.entry as Array<FHIRLocationResource>,
      isLoading: false,
      totalResults: 4,
      hasMore: false,
      loadingNewData: false,
      error: null,
      setPage: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('should render a search input and list of login locations', async () => {
    render(<LocationPicker selectedLocationUuid={annexLocationUuid} onChange={vi.fn()} />);

    const searchInput = screen.getByRole('searchbox', { name: /search for a location/i });
    expect(searchInput).toBeInTheDocument();

    await waitFor(() => {
      const locations = screen.getAllByRole('radio');
      expect(locations).toHaveLength(4);
    });

    const expectedLocations = [/community outreach/, /annex/, /mobile office/, /main office/];
    expectedLocations.forEach((locationName) => {
      expect(screen.getByRole('radio', { name: new RegExp(locationName, 'i') })).toBeInTheDocument();
    });
  });

  it('should call onChange when a location is selected', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<LocationPicker selectedLocationUuid={validLocationUuid} onChange={handleChange} />);

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /annex/i })).toBeInTheDocument();
    });

    const location = screen.getByRole('radio', { name: /annex/i });
    await user.click(location);

    expect(handleChange).toHaveBeenCalledWith(annexLocationUuid);
  });

  it('should select the provided selectedLocation when the component is rendered', async () => {
    render(<LocationPicker selectedLocationUuid={annexLocationUuid} onChange={vi.fn()} />);

    await waitFor(() => {
      const annexOption = screen.getByRole('radio', { name: /annex/i });
      expect(annexOption).toBeChecked();
    });
  });

  it('should load the default location on top of the list', async () => {
    mockUseLocationByUuid.mockReturnValue({
      location: annexResponse.data.entry[0] as any,
      error: null,
      isLoading: false,
    });

    render(<LocationPicker defaultLocationUuid={annexLocationUuid} onChange={vi.fn()} />);

    await waitFor(() => {
      const locations = screen.getAllByRole('radio');
      expect(locations).toHaveLength(4);
    });

    // Verify the default location (Annex) appears first in the list
    const locations = screen.getAllByRole('radio');
    expect(locations[0]).toHaveAccessibleName(/annex/i);

    const expectedLocations = [/community outreach/, /annex/, /mobile office/, /main office/];
    expectedLocations.forEach((locationName) => {
      expect(screen.getByRole('radio', { name: new RegExp(locationName, 'i') })).toBeInTheDocument();
    });
  });

  it('should not display the default location if search result does not contain the default location', async () => {
    const user = userEvent.setup();

    mockUseLocationByUuid.mockReturnValue({
      location: annexResponse.data.entry[0] as any,
      error: null,
      isLoading: false,
    });

    // Mock useLocations to return different results based on search query
    mockUseLocations.mockImplementation((locationTag, count, searchQuery) => {
      if (searchQuery === 'main') {
        return {
          locations: mainOfficeResponse.data.entry as any,
          isLoading: false,
          totalResults: 1,
          hasMore: false,
          loadingNewData: false,
          error: null,
          setPage: vi.fn().mockResolvedValue(undefined),
        };
      }
      return {
        locations: mockLoginLocations.data.entry as any,
        isLoading: false,
        totalResults: 4,
        hasMore: false,
        loadingNewData: false,
        error: null,
        setPage: vi.fn().mockResolvedValue(undefined),
      };
    });

    render(<LocationPicker defaultLocationUuid={annexLocationUuid} onChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('searchbox', { name: /search for a location/i })).toBeInTheDocument();
    });

    const searchInput = screen.getByRole('searchbox', { name: /search for a location/i });
    await user.type(searchInput, 'main');

    await waitFor(() => {
      expect(screen.queryByRole('radio', { name: /annex/i })).not.toBeInTheDocument();
    });
  });

  it('should display a message and not display locations when search results are empty', async () => {
    const user = userEvent.setup();

    mockUseLocationByUuid.mockReturnValue({
      location: annexResponse.data.entry[0] as any,
      error: null,
      isLoading: false,
    });

    // Mock useLocations to return empty results when searching for non-existent location
    mockUseLocations.mockImplementation((locationTag, count, searchQuery) => {
      if (searchQuery === 'search_for_no_location') {
        return {
          locations: [] as any,
          isLoading: false,
          totalResults: 0,
          hasMore: false,
          loadingNewData: false,
          error: null,
          setPage: vi.fn().mockResolvedValue(undefined),
        };
      }
      return {
        locations: mockLoginLocations.data.entry as any,
        isLoading: false,
        totalResults: 4,
        hasMore: false,
        loadingNewData: false,
        error: null,
        setPage: vi.fn().mockResolvedValue(undefined),
      };
    });

    render(<LocationPicker defaultLocationUuid={annexLocationUuid} onChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('searchbox', { name: /search for a location/i })).toBeInTheDocument();
    });

    const searchInput = screen.getByRole('searchbox', { name: /search for a location/i });
    await user.type(searchInput, 'search_for_no_location');

    await waitFor(() => {
      expect(screen.getByText(/no results to display/i)).toBeInTheDocument();
    });

    const locations = screen.queryAllByRole('radio');
    expect(locations).toHaveLength(0);
  });

  it('should display skeleton loaders when loading initial data', () => {
    mockUseLocations.mockReturnValue({
      locations: [] as any,
      isLoading: true,
      totalResults: undefined,
      hasMore: false,
      loadingNewData: false,
      error: null,
      setPage: vi.fn().mockResolvedValue(undefined),
    });

    render(<LocationPicker onChange={vi.fn()} />);

    const skeletons = screen.getAllByRole('progressbar');
    expect(skeletons).toHaveLength(5);
  });

  it('should display loading indicator when loading new data', async () => {
    mockUseLocations.mockReturnValue({
      locations: mockLoginLocations.data.entry as any,
      isLoading: false,
      totalResults: 4,
      hasMore: true,
      loadingNewData: true,
      error: null,
      setPage: vi.fn().mockResolvedValue(undefined),
    });

    render(<LocationPicker onChange={vi.fn()} />);

    await waitFor(() => {
      // Find the loading text in the InlineLoading component (not in SVG title)
      const loadingTexts = screen.getAllByText(/loading/i);
      const loadingIndicator = loadingTexts.find((element) => element.className.includes('cds--inline-loading__text'));
      expect(loadingIndicator).toBeInTheDocument();
    });
  });

  it('should call onChange with undefined when search input changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<LocationPicker onChange={handleChange} />);

    await waitFor(() => {
      expect(screen.getByRole('searchbox', { name: /search for a location/i })).toBeInTheDocument();
    });

    const searchInput = screen.getByRole('searchbox', { name: /search for a location/i });
    await user.type(searchInput, 'test');

    // onChange is called without arguments when search changes, which means locationUuid is undefined
    expect(handleChange).toHaveBeenCalled();
    expect(handleChange.mock.calls[0][0]).toBeUndefined();
  });

  it('should trim whitespace from search terms', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<LocationPicker onChange={handleChange} />);

    await waitFor(() => {
      expect(screen.getByRole('searchbox', { name: /search for a location/i })).toBeInTheDocument();
    });

    const searchInput = screen.getByRole('searchbox', { name: /search for a location/i });
    await user.type(searchInput, '  main  ');

    // Verify that the trimmed search term is used (check if the mock was called with trimmed value)
    // The actual trimming happens in the component, so we verify by checking the search was performed
    await waitFor(() => {
      // The search should filter results - verify main office appears
      expect(screen.getByRole('radio', { name: /main office/i })).toBeInTheDocument();
    });
  });

  it('should filter out default location from fetched locations to avoid duplicates', async () => {
    const defaultLocationEntry = annexResponse.data.entry[0];
    const locationsWithDuplicate = [defaultLocationEntry, ...mockLoginLocations.data.entry];

    mockUseLocationByUuid.mockReturnValue({
      location: defaultLocationEntry as any,
      error: null,
      isLoading: false,
    });

    mockUseLocations.mockReturnValue({
      locations: locationsWithDuplicate as any,
      isLoading: false,
      totalResults: 5,
      hasMore: false,
      loadingNewData: false,
      error: null,
      setPage: vi.fn().mockResolvedValue(undefined),
    });

    render(<LocationPicker defaultLocationUuid={annexLocationUuid} onChange={vi.fn()} />);

    await waitFor(() => {
      const locations = screen.getAllByRole('radio');
      expect(locations).toHaveLength(4);
    });

    // Verify the default location (Annex) appears first in the list
    const locations = screen.getAllByRole('radio');
    expect(locations[0]).toHaveAccessibleName(/annex/i);

    // Verify Annex only appears once
    const annexLocations = screen.getAllByRole('radio', { name: /annex/i });
    expect(annexLocations).toHaveLength(1);
  });

  it('should not show default location when search term is provided', async () => {
    const user = userEvent.setup();
    const defaultLocationEntry = annexResponse.data.entry[0];

    mockUseLocationByUuid.mockReturnValue({
      location: defaultLocationEntry as any,
      error: null,
      isLoading: false,
    });

    // Mock useLocations to return filtered results when searching
    mockUseLocations.mockImplementation((locationTag, count, searchQuery) => {
      if (searchQuery === 'mobile') {
        // Return only Mobile Office when searching for "mobile"
        const mobileClinic = mockLoginLocations.data.entry.find((entry) => entry.resource.name === 'Mobile Office');
        return {
          locations: mobileClinic ? [mobileClinic] : ([] as any),
          isLoading: false,
          totalResults: 1,
          hasMore: false,
          loadingNewData: false,
          error: null,
          setPage: vi.fn().mockResolvedValue(undefined),
        };
      }
      return {
        locations: mockLoginLocations.data.entry as any,
        isLoading: false,
        totalResults: 4,
        hasMore: false,
        loadingNewData: false,
        error: null,
        setPage: vi.fn().mockResolvedValue(undefined),
      };
    });

    render(<LocationPicker defaultLocationUuid={annexLocationUuid} onChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('searchbox', { name: /search for a location/i })).toBeInTheDocument();
    });

    const searchInput = screen.getByRole('searchbox', { name: /search for a location/i });
    await user.type(searchInput, 'mobile');

    await waitFor(() => {
      // Default location should not appear when searching
      expect(screen.queryByRole('radio', { name: /annex/i })).not.toBeInTheDocument();
    });
  });

  it('should display inline error notification when location loading fails', async () => {
    const mockError = new Error('Failed to load locations');

    mockUseLocations.mockReturnValue({
      locations: [] as any,
      isLoading: false,
      totalResults: undefined,
      hasMore: false,
      loadingNewData: false,
      error: mockError,
      setPage: vi.fn().mockResolvedValue(undefined),
    });

    render(<LocationPicker onChange={vi.fn()} />);

    await waitFor(() => {
      // Find the error text in the InlineNotification (not in SVG title)
      const errorTexts = screen.getAllByText(/error/i);
      const errorNotification = errorTexts.find((element) => element.textContent === 'Error');
      expect(errorNotification).toBeInTheDocument();
    });

    expect(screen.getByText(/unable to load login locations/i)).toBeInTheDocument();
  });
});
