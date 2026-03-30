import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

import LoadingState from '@/components/ui/LoadingState'
import { useUpdateUserProfileMutation, useUpdateUserPreferenceMutation } from '@/hooks/queries/user/useUserMutations'
import { useUser, useUserPreference } from '@/hooks/queries/user/useUser'
import {
  fromUserPreferenceResponse,
  isUserPreferenceFormComplete,
  toUserPreferenceRequest,
} from '@/lib/userPreference'
import Sidebar from '../components/Sidebar'

const Settings = () => {
  const { user } = useUser({ enabled: true })
  const { preference } = useUserPreference({ enabled: !!user })
  const { mutateAsync: updateUserProfile, isPending: isUpdatingProfile } =
    useUpdateUserProfileMutation()
  const { mutateAsync: updatePreference, isPending: isUpdatingPreference } =
    useUpdateUserPreferenceMutation()
  const [formData, setFormData] = useState({
    nickname: '',
    email: '',
    bio: '',
    purpose: '' as 'personal' | 'professional' | '',
    age: '' as '20s' | '30s' | '40s+' | '',
    gender: '' as 'male' | 'female' | '',
  })
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isEditingPreference, setIsEditingPreference] = useState(false)

  useEffect(() => {
    if (!user || isEditingProfile) {
      return
    }

    setFormData((prev) => ({
      ...prev,
      nickname: user.name,
      email: user.email,
      bio: user.bio ?? '',
    }))
  }, [isEditingProfile, user])

  useEffect(() => {
    if (!preference || isEditingPreference) {
      return
    }

    const mappedPreference = fromUserPreferenceResponse(preference)
    setFormData((prev) => ({
      ...prev,
      ...mappedPreference,
    }))
  }, [isEditingPreference, preference])

  const resetProfileFromUser = () => {
    if (!user) return
    setFormData((prev) => ({
      ...prev,
      nickname: user.name,
      email: user.email,
      bio: user.bio ?? '',
    }))
    setIsEditingProfile(false)
  }

  const resetPreferenceFromSaved = () => {
    if (!preference) {
      setFormData((prev) => ({
        ...prev,
        purpose: '',
        age: '',
        gender: '',
      }))
      setIsEditingPreference(false)
      return
    }
    setFormData((prev) => ({
      ...prev,
      purpose:
        preference.usageType === '사적'
          ? 'personal'
          : preference.usageType === '공적'
            ? 'professional'
            : '',
      age:
        preference.ageGroup === '20s' ||
        preference.ageGroup === '30s' ||
        preference.ageGroup === '40s+'
          ? preference.ageGroup
          : '',
      gender:
        preference.gender === '남성'
          ? 'male'
          : preference.gender === '여성'
            ? 'female'
            : '',
    }))
    setIsEditingPreference(false)
  }

  const handleSaveProfile = () => {
    void (async () => {
      try {
        await updateUserProfile({
          name: formData.nickname,
          bio: formData.bio,
        })
        toast.success('사용자 정보가 저장되었습니다.')
        setIsEditingProfile(false)
      } catch (error) {
        console.error('사용자 정보 저장 실패:', error)
        toast.error('사용자 정보 저장 중 오류가 발생했습니다.')
      }
    })()
  }

  const handleSavePreference = () => {
    if (!isUserPreferenceFormComplete(formData)) {
      toast.error('이용 목적, 나이대, 성별을 모두 선택해 주세요.')
      return
    }
    void (async () => {
      try {
        await updatePreference(toUserPreferenceRequest(formData))
        toast.success('취향 정보가 저장되었습니다.')
        setIsEditingPreference(false)
      } catch (error) {
        console.error('취향 정보 저장 실패:', error)
        toast.error('취향 정보 저장 중 오류가 발생했습니다.')
      }
    })()
  }

  if (!user) {
    return (
      <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">
          <LoadingState message="사용자 정보를 불러오는 중입니다..." />
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-8 py-6 flex justify-between items-center border-b border-primary/5">
          <div>
            <h2 className="text-2xl font-black tracking-tight">환경설정</h2>
            <p className="text-slate-500 text-sm mt-1">
              회원 정보와 맞춤형 추천 정보를 관리하세요.
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <button className="size-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-primary/10">
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">
                notifications
              </span>
            </button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto p-8 space-y-8">
          {/* User Profile Section */}
          <section className="bg-white dark:bg-slate-900/50 rounded-xl p-8 shadow-sm border border-primary/5">
            <div className="flex items-center gap-2 mb-8 border-b border-primary/5 pb-4">
              <span className="material-symbols-outlined text-primary">person</span>
              <h3 className="text-xl font-bold">사용자 정보</h3>
            </div>
            <div className="flex flex-col md:flex-row gap-10 items-start">
              <div className="relative group">
                <div className="size-32 rounded-full border-4 border-primary/10 overflow-hidden bg-slate-100">
                  <img
                    alt="Profile"
                    className="w-full h-full object-cover"
                    src={user?.profileImage || "https://via.placeholder.com/128"}
                  />
                </div>
                <button className="absolute bottom-0 right-0 size-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined size-5">photo_camera</span>
                </button>
              </div>
              <div className="flex-1 w-full space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      닉네임
                    </label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={formData.nickname}
                        onChange={(e) =>
                          setFormData({ ...formData, nickname: e.target.value })
                        }
                        className="w-full px-4 py-3 rounded-lg border border-primary/20 bg-background-light dark:bg-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                      />
                    ) : (
                      <p className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                        {formData.nickname}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      이메일
                    </label>
                    <input
                      type="email"
                      value={formData.email || user.email}
                      disabled
                      className="w-full px-4 py-3 rounded-lg border border-primary/5 bg-slate-100 dark:bg-slate-900 text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    한 줄 소개
                  </label>
                  {isEditingProfile ? (
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-primary/20 bg-background-light dark:bg-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                      placeholder="술과 안주에 진심인 사람입니다."
                      rows={3}
                    />
                  ) : (
                    <p className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700 text-slate-700 dark:text-slate-200 min-h-[72px]">
                      {formData.bio || '등록된 소개가 없습니다.'}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              {isEditingProfile ? (
                <>
                  <button
                    type="button"
                    onClick={resetProfileFromUser}
                    disabled={isUpdatingProfile}
                    className="px-5 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={isUpdatingProfile}
                    className="px-5 py-2 rounded-xl text-sm font-bold bg-primary text-white border border-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isUpdatingProfile ? '저장 중...' : '저장하기'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  className="inline-flex min-w-[160px] justify-center px-8 py-3 rounded-xl text-sm font-bold border transition-colors bg-white dark:bg-slate-900 text-primary border-primary/40 hover:border-primary"
                >
                  수정하기
                </button>
              )}
            </div>
          </section>

          {/* Onboarding Preferences Section */}
          <section className="bg-white dark:bg-slate-900/50 rounded-xl p-8 shadow-sm border border-primary/5">
            <div className="flex items-center gap-2 mb-8 border-b border-primary/5 pb-4">
              <span className="material-symbols-outlined text-primary">tune</span>
              <div>
                <h3 className="text-xl font-bold">취향 및 온보딩 정보</h3>
                <p className="mt-1 text-xs text-slate-500">
                  선호하는 분위기와 나이대 등 맞춤형 추천을 위한 정보를 설정하세요.
                </p>
              </div>
            </div>
            <div className="space-y-8">
              {/* Usage Purpose */}
              <div className="space-y-4">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  주된 이용 목적
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    type="button"
                    disabled={!isEditingPreference}
                    onClick={() =>
                      isEditingPreference &&
                      setFormData({ ...formData, purpose: 'professional' })
                    }
                    className={`px-4 py-3 rounded-xl border-2 font-bold transition-all ${
                      formData.purpose === 'professional'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-primary/10 text-slate-600 dark:text-slate-400'
                    } ${!isEditingPreference ? 'cursor-not-allowed opacity-70' : 'hover:border-primary/30'}`}
                  >
                    비즈니스/공적
                  </button>
                  <button
                    type="button"
                    disabled={!isEditingPreference}
                    onClick={() =>
                      isEditingPreference &&
                      setFormData({ ...formData, purpose: 'personal' })
                    }
                    className={`px-4 py-3 rounded-xl border-2 font-bold transition-all ${
                      formData.purpose === 'personal'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-primary/10 text-slate-600 dark:text-slate-400'
                    } ${!isEditingPreference ? 'cursor-not-allowed opacity-70' : 'hover:border-primary/30'}`}
                  >
                    친목/사적
                  </button>
                </div>
              </div>

              {/* Age & Gender */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    나이대 설정
                  </p>
                  <select
                    value={formData.age}
                    disabled={!isEditingPreference}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        age: e.target.value as '20s' | '30s' | '40s+',
                      })
                    }
                    className={`w-full px-4 py-3 rounded-lg border outline-none appearance-none transition-all ${
                      isEditingPreference
                        ? 'border-primary/20 bg-background-light dark:bg-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary'
                        : 'border-primary/5 bg-slate-100 dark:bg-slate-900 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <option value="">선택 안 함</option>
                    <option value="20s">20대</option>
                    <option value="30s">30대</option>
                    <option value="40s+">40대 이상</option>
                  </select>
                </div>
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    성별
                  </p>
                  <div className="flex bg-background-light dark:bg-slate-800 rounded-lg p-1 border border-primary/20">
                    <button
                      type="button"
                      disabled={!isEditingPreference}
                      onClick={() =>
                        isEditingPreference && setFormData({ ...formData, gender: 'male' })
                      }
                      className={`flex-1 py-2 rounded-md font-bold transition-all ${
                        formData.gender === 'male'
                          ? 'bg-white dark:bg-slate-700 shadow-sm text-primary'
                          : 'text-slate-500'
                      } ${!isEditingPreference ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      남성
                    </button>
                    <button
                      type="button"
                      disabled={!isEditingPreference}
                      onClick={() =>
                        isEditingPreference && setFormData({ ...formData, gender: 'female' })
                      }
                      className={`flex-1 py-2 rounded-md font-bold transition-all ${
                        formData.gender === 'female'
                          ? 'bg-white dark:bg-slate-700 shadow-sm text-primary'
                          : 'text-slate-500'
                      } ${!isEditingPreference ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      여성
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex justify-end gap-4 pt-4">
                {isEditingPreference ? (
                  <>
                    <button
                      type="button"
                      onClick={resetPreferenceFromSaved}
                      disabled={isUpdatingPreference}
                      className="px-8 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePreference}
                      disabled={isUpdatingPreference}
                      className="px-10 py-4 rounded-xl bg-primary text-white font-black shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {isUpdatingPreference ? '저장 중...' : '저장하기'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingPreference(true)}
                    className="inline-flex min-w-[160px] justify-center px-8 py-3 rounded-xl text-sm font-bold border transition-colors bg-white dark:bg-slate-900 text-primary border-primary/40 hover:border-primary"
                  >
                    수정하기
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default Settings
