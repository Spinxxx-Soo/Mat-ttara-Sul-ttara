export type UsagePurpose = 'personal' | 'professional';
export type AgeGroup = '20s' | '30s' | '40s+';
export type Gender = 'male' | 'female';

export interface UserPreferenceFormData {
  purpose: UsagePurpose | '';
  age: AgeGroup | '';
  gender: Gender | '';
}

export const toUserPreferenceRequest = (
  formData: UserPreferenceFormData
) => ({
  usageType: formData.purpose === 'personal' ? '사적' : '공적',
  ageGroup: formData.age,
  gender: formData.gender === 'male' ? '남성' : '여성',
});

export const isUserPreferenceFormComplete = (
  formData: UserPreferenceFormData
) =>
  Boolean(formData.purpose) &&
  Boolean(formData.age) &&
  Boolean(formData.gender);
