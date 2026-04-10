export const getGenderedTitle = (title: string, gender?: 'male' | 'female' | 'other') => {
  if (!title) return '';
  if (!gender || gender === 'other') return title;

  let processedTitle = title;

  // Handle common Polish patterns like "Magazynier (k/m)" first to avoid incorrect splitting by slash
  const genderMarkers = [/\s*\(k\/m\)\s*/i, /\s*\(m\/k\)\s*/i];
  for (const marker of genderMarkers) {
    if (marker.test(processedTitle)) {
      return processedTitle.replace(marker, '').trim();
    }
  }

  // Pattern: "Operator / Operatorka" or "Operator/Operatorka" or "Operator (k/m)"
  // Split by slash or backslash
  const parts = processedTitle.split(/[\/\\]/);
  if (parts.length === 2) {
    return gender === 'male' ? parts[0].trim() : parts[1].trim();
  }

  return processedTitle;
};
