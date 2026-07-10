import { UuidIdGenerator } from './uuid-id-generator.service';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

import { v4 as uuidv4 } from 'uuid';

describe('UuidIdGenerator', () => {
  let generator: UuidIdGenerator;
  let mockUuidv4: jest.MockedFunction<typeof uuidv4>;

  beforeEach(() => {
    generator = new UuidIdGenerator();
    mockUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;
    jest.clearAllMocks();
  });

  it('should generate ID using uuid v4', () => {
    const expectedUuid = '550e8400-e29b-41d4-a716-446655440000';
    mockUuidv4.mockReturnValue(expectedUuid);

    const result = generator.generate();

    expect(mockUuidv4).toHaveBeenCalled();
    expect(result).toBe(expectedUuid);
  });

  it('should delegate to uuid.v4() function', () => {
    mockUuidv4.mockReturnValue('test-uuid');

    generator.generate();

    expect(mockUuidv4).toHaveBeenCalledTimes(1);
  });
});
