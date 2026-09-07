export type PublicConfig = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

export type PublicConfigResult =
  | { ok: true; value: PublicConfig }
  | { ok: false; message: string };

export function validatePublicConfig(input: {
  supabaseUrl?: string;
  supabasePublishableKey?: string;
}): PublicConfigResult {
  const supabaseUrl = input.supabaseUrl?.trim();
  const supabasePublishableKey = input.supabasePublishableKey?.trim();

  if (!supabaseUrl || !supabasePublishableKey) {
    return {
      ok: false,
      message: 'Dance AI is missing required public configuration.',
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    return { ok: false, message: 'Dance AI has an invalid Supabase URL.' };
  }

  if (parsedUrl.protocol !== 'https:') {
    return { ok: false, message: 'Dance AI requires an HTTPS Supabase URL.' };
  }

  if (supabasePublishableKey.length < 12) {
    return {
      ok: false,
      message: 'Dance AI has an invalid Supabase publishable key.',
    };
  }

  return {
    ok: true,
    value: {
      supabaseUrl: parsedUrl.toString().replace(/\/$/, ''),
      supabasePublishableKey,
    },
  };
}

export function readPublicConfig(): PublicConfigResult {
  return validatePublicConfig({
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
