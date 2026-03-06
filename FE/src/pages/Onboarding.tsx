import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const Onboarding = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    purpose: '' as 'personal' | 'professional' | '',
    age: '' as '20s' | '30s' | '40s+' | '',
    gender: '' as 'male' | 'female' | '',
  })

  const handlePurposeSelect = (purpose: 'personal' | 'professional') => {
    setFormData({ ...formData, purpose })
  }

  const handleAgeSelect = (age: '20s' | '30s' | '40s+') => {
    setFormData({ ...formData, age })
  }

  const handleGenderSelect = (gender: 'male' | 'female') => {
    setFormData({ ...formData, gender })
  }

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1)
    } else {
      // TODO: 온보딩 데이터 저장 후 메인으로 이동
      navigate('/')
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const progress = (step / 3) * 100

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-primary/10 px-6 py-4 lg:px-40">
        <div className="flex items-center gap-4 text-slate-900 dark:text-slate-100">
          <div className="size-6 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">rocket_launch</span>
          </div>
          <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">
            Onboarding
          </h2>
        </div>
        <button
          onClick={() => navigate('/')}
          className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-primary text-white text-sm font-bold leading-normal transition-opacity hover:opacity-90"
        >
          <span className="truncate">Skip</span>
        </button>
      </header>

      <main className="flex-1 flex justify-center py-10 px-4">
        <div className="flex flex-col max-w-[640px] flex-1 gap-8">
          {/* Progress Bar */}
          <div className="flex flex-col gap-3 px-2">
            <div className="flex gap-6 justify-between items-end">
              <div>
                <h3 className="text-primary font-bold text-sm uppercase tracking-wider">
                  Step {step} of 3
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-normal">
                  Setting up your profile
                </p>
              </div>
              <p className="text-slate-900 dark:text-slate-100 text-lg font-bold">
                {Math.round(progress)}%
              </p>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Step 1: Purpose */}
          {step === 1 && (
            <section className="flex flex-col gap-6">
              <h2 className="text-slate-900 dark:text-slate-100 tracking-tight text-2xl lg:text-3xl font-bold leading-tight px-2">
                주된 이용 목적은 무엇인가요?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => handlePurposeSelect('personal')}
                  className={`flex flex-col gap-4 rounded-xl bg-white dark:bg-slate-800 p-5 shadow-sm border-2 cursor-pointer transition-all ${
                    formData.purpose === 'personal'
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div
                      className={`p-2 rounded-lg ${
                        formData.purpose === 'personal'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <span className="material-symbols-outlined">person</span>
                    </div>
                    {formData.purpose === 'personal' && (
                      <span className="material-symbols-outlined text-primary">
                        check_circle
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-slate-900 dark:text-slate-100 text-lg font-bold">
                      사적 이용
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                      친구, 가족과의 모임
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => handlePurposeSelect('professional')}
                  className={`flex flex-col gap-4 rounded-xl bg-white dark:bg-slate-800 p-5 shadow-sm border-2 cursor-pointer transition-all ${
                    formData.purpose === 'professional'
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div
                      className={`p-2 rounded-lg ${
                        formData.purpose === 'professional'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <span className="material-symbols-outlined">
                        business_center
                      </span>
                    </div>
                    {formData.purpose === 'professional' && (
                      <span className="material-symbols-outlined text-primary">
                        check_circle
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-slate-900 dark:text-slate-100 text-lg font-bold">
                      공적 이용
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                      업무, 비즈니스 모임
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Step 2: Age */}
          {step === 2 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold px-2">
                약속에 참여하는 나이대는?
              </h2>
              <div className="flex gap-3 px-2 overflow-x-auto pb-2">
                {(['20s', '30s', '40s+'] as const).map((age) => (
                  <button
                    key={age}
                    onClick={() => handleAgeSelect(age)}
                    className={`min-w-[100px] py-3 px-4 rounded-lg border text-center text-sm font-medium transition-all ${
                      formData.age === age
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {age === '20s' ? '20대' : age === '30s' ? '30대' : '40대 이상'}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Step 3: Gender */}
          {step === 3 && (
            <section className="flex flex-col gap-4 pb-10">
              <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold px-2">
                성별을 선택해주세요
              </h2>
              <div className="flex gap-4 px-2">
                <button
                  onClick={() => handleGenderSelect('male')}
                  className={`flex-1 py-3 px-4 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                    formData.gender === 'male'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">male</span>
                  <span className="text-sm font-medium">남성</span>
                </button>
                <button
                  onClick={() => handleGenderSelect('female')}
                  className={`flex-1 py-3 px-4 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                    formData.gender === 'female'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">female</span>
                  <span className="text-sm font-medium">여성</span>
                </button>
              </div>
            </section>
          )}

          {/* Navigation Footer */}
          <footer className="mt-auto pt-6 border-t border-primary/10 flex justify-between items-center">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold px-4 py-2 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={
                (step === 1 && !formData.purpose) ||
                (step === 2 && !formData.age) ||
                (step === 3 && !formData.gender)
              }
              className="bg-primary text-white font-bold px-10 py-3 rounded-xl shadow-lg shadow-primary/30 hover:translate-y-[-2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {step === 3 ? '완료' : 'Next Step'}
            </button>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default Onboarding
