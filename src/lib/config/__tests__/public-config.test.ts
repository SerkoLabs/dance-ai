import { validatePublicConfig } from '../public-config';

describe('validatePublicConfig', () => {
  it('accepts an HTTPS URL and non-empty publishable key', () => {
    const result = validatePublicConfig({
      supabaseUrl: 'https://example.supabase.co/',
      supabasePublishableKey: 'sb_publishable_example_value',
    });

    expect(result).toEqual({
      ok: true,
      value: {
        supabaseUrl: 'https://example.supabase.co',
        supabasePublishableKey: 'sb_publishable_example_value',
      },
    });
  });

  it('rejects missing configuration', () => {
    expect(validatePublicConfig({})).toEqual({
      ok: false,
      message: 'Dance AI is missing required public configuration.',
    });
  });

  it('rejects a non-HTTPS Supabase URL', () => {
    expect(
      validatePublicConfig({
        supabaseUrl: 'http://localhost:54321',
        supabasePublishableKey: 'sb_publishable_example_value',
      }),
    ).toEqual({
      ok: false,
      message: 'Dance AI requires an HTTPS Supabase URL.',
    });
  });
});
