import { describe, expect, it } from 'vitest';
import { type NameUse } from '@egen/esm-globals';
import { formatEntityName, getEntityName, selectPreferredName } from './entity-helpers';
import {
  mockEntityWithNoName,
  mockEntityWithOfficialName,
  nameWithFormat,
  nameWithoutFormat,
  familyNameOnly,
  givenNameOnly,
  mockEntityWithMultipleNames,
  mockEntityWithNickAndOfficialName,
} from './entity-helpers.test.data';

describe('Formatted display name', () => {
  it.each([
    [nameWithFormat, 'Wilson, John'],
    [nameWithoutFormat, 'given middle family name'],
    [familyNameOnly, 'family name'],
    [givenNameOnly, 'given'],
    [mockEntityWithNoName, ''],
  ])('Is formatted name text if present else default name format', (name, expected) => {
    const result = formatEntityName(name);
    expect(result).toBe(expected);
  });
});

describe('Entity display name', () => {
  it.each([
    [mockEntityWithMultipleNames, 'Smith, John Murray'],
    [mockEntityWithOfficialName, 'my actual name'],
    [mockEntityWithNickAndOfficialName, 'my official name'],
  ])('Is selected from usual name or official name', (entity, expected) => {
    const result = getEntityName(entity);
    expect(result).toBe(expected);
  });
});

const usual: NameUse = 'usual';
const official: NameUse = 'official';
const maiden: NameUse = 'maiden';
const nickname: NameUse = 'nickname';
const temp: NameUse = 'temp';

describe('Preferred entity name', () => {
  it.each([
    [mockEntityWithMultipleNames, [], 'id-of-usual-name-1'],
    [mockEntityWithMultipleNames, [usual], 'id-of-usual-name-1'],
    [mockEntityWithMultipleNames, [usual, official], 'id-of-usual-name-1'],
    [mockEntityWithMultipleNames, [official], 'id-of-official-name-1'],
    [mockEntityWithMultipleNames, [official, usual], 'id-of-official-name-1'],
    [mockEntityWithMultipleNames, [maiden, usual, official], 'id-of-maiden-name-1'],
    [mockEntityWithOfficialName, [usual, official], 'id-of-usual-name-1'],
    [mockEntityWithNickAndOfficialName, [nickname, official], 'id-of-nickname-1'],
  ])('Is selected according to preferred usage', (entity, preferredUsage, expectedNameId) => {
    const result = selectPreferredName(entity, ...preferredUsage);
    expect(result?.id).toBe(expectedNameId);
  });
});

describe('Preferred entity name fallback', () => {
  it.each([
    [mockEntityWithMultipleNames, [temp]],
    [mockEntityWithNoName, [usual]],
    [mockEntityWithNoName, []],
  ])('Is empty if preferred name is not present.', (entity, preferredUsage) => {
    const result = selectPreferredName(entity, ...preferredUsage);
    expect(result).toBeUndefined();
  });
});
