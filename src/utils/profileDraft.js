// A profile refresh may return a new object for the same user. Keep the
// in-progress form until Save; never reuse it for another account.
export function resolveProfileForm(profile, draft) {
  if (profile?.id && draft?.userId === profile.id) {
    return draft.values
  }

  return {
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  }
}

export function updateProfileDraft(profile, draft, updates) {
  return {
    userId: profile.id,
    values: {
      ...resolveProfileForm(profile, draft),
      ...updates,
    },
  }
}
