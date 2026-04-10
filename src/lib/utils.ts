export const getGenderedTitle = (title: string, gender?: 'male' | 'female' | 'other') => {
  if (!title) return '';
  if (!gender || gender === 'other') return title;

  // Pattern: "Operator / Operatorka" or "Operator/Operatorka" or "Operator (k/m)"
  // Split by slash or backslash
  const parts = title.split(/[\/\\]/);
  if (parts.length === 2) {
    return gender === 'male' ? parts[0].trim() : parts[1].trim();
  }

  // Handle common Polish patterns like "Magazynier (k/m)"
  if (title.includes('(k/m)') || title.includes('(K/M)') || title.includes('(m/k)') || title.includes('(M/K)')) {
     return title.replace(/\s*\(k\/m\)\s*/i, '').replace(/\s*\(m\/k\)\s*/i, '').trim();
  }

  return title;
};
