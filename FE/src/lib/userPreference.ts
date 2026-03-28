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
  ageGroup:
    formData.age === '20s' ? '20대' : formData.age === '30s' ? '30대' : '40대 이상',
  gender: formData.gender === 'male' ? '남성' : '여성',
});

export const fromUserPreferenceResponse = (data: {
  usageType: string;
  ageGroup: string;
  gender: string;
}): UserPreferenceFormData => ({
  purpose: data.usageType === '사적' ? 'personal' : 'professional',
  age:
    data.ageGroup === '20대'
      ? '20s'
      : data.ageGroup === '30대'
        ? '30s'
        : '40s+',
  gender: data.gender === '남성' ? 'male' : 'female',
});

export const isUserPreferenceFormComplete = (
  formData: UserPreferenceFormData
) =>
  Boolean(formData.purpose) &&
  Boolean(formData.age) &&
  Boolean(formData.gender);
