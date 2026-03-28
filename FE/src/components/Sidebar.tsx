import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { queryKeys } from '@/hooks/queries/queryKeys'
import { logout } from '@/api/authApi'
import { usePlanStore } from '@/stores/planStore'
import minLogoImage from '@/assets/minlogo.png'

interface SidebarProps {
  className?: string
}

const Sidebar = ({ className = '' }: SidebarProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { logout: logoutStore, user } = useAuthStore()
  const { selectedPlan } = usePlanStore()
  
  const handleLogout = async () => {
    try {
      // 백엔드에 로그아웃 요청 (선택사항)
      await logout()
    } catch (error) {
      console.error('로그아웃 API 호출 실패:', error)
    } finally {
      // 상태 관리에서 로그아웃 처리
      queryClient.removeQueries({ queryKey: queryKeys.user.all })
      queryClient.removeQueries({ queryKey: queryKeys.plan.all })
      queryClient.removeQueries({ queryKey: queryKeys.chat.all })
      logoutStore()
      navigate('/login')
    }
  }

  const menuItems = [
    { path: '/', icon: 'home', label: '홈' },
    { path: '/search', icon: 'search', label: '검색' },
    { path: '/my-plan', icon: 'calendar_today', label: '마이플랜' },
    { path: '/settings', icon: 'settings', label: '환경설정' },
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  const profileImageUrl = user?.profileImage?.trim()
  const avatarSrc =
    profileImageUrl ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.email || user?.name || 'user')}`

  return (
    <aside className={`w-20 h-full flex flex-col justify-between items-center py-6 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 z-50 shadow-sm ${className}`}>
      <div className="flex flex-col gap-8 items-center w-full">
        {/* 사이드바용 축소 로고 (로그인은 logo.png 유지) */}
        <Link
          to="/"
          title="홈"
          className="block w-12 h-12 shrink-0"
        >
          <img
            src={minLogoImage}
            alt="맛따라 술따라"
            className="h-full w-full object-contain object-center"
            draggable={false}
          />
        </Link>
        
        {/* 메뉴 아이템 */}
        <div className="flex flex-col gap-4 items-center w-full px-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1.5 group w-full ${
                isActive(item.path)
                  ? 'text-primary'
                  : 'text-slate-500 hover:text-primary'
              } transition-all duration-200`}
            >
              <div
                className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-primary/15 text-primary shadow-md'
                    : 'hover:bg-primary/5 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: isActive(item.path) ? "'FILL' 1" : "'FILL' 0" }}>
                  {item.icon}
                </span>
              </div>
              <span className={`text-[10px] font-semibold transition-colors ${
                isActive(item.path) ? 'text-primary' : 'text-slate-500 dark:text-slate-400'
              }`}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
      
      {/* 사용자 프로필 및 선택된 플랜 정보 */}
      <div className="flex flex-col items-center gap-4 w-full px-2">
        {selectedPlan && (
          <Link 
            to={`/plans/${selectedPlan.planId}`}
            className="flex flex-col items-center gap-1 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500 group"
          >
            <div className="bg-primary/10 p-2 rounded-xl border border-primary/20 text-primary text-center group-hover:bg-primary/20 transition-colors">
              <span className="material-symbols-outlined text-xl block">assignment</span>
              <span className="text-[9px] font-bold block truncate max-w-[60px]">{selectedPlan.title}</span>
            </div>
          </Link>
        )}
        <button
          className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-orange-100 dark:from-primary/30 dark:to-orange-900/30 overflow-hidden border-2 border-primary/30 hover:border-primary transition-all shadow-md hover:shadow-lg"
          title={user?.name || '사용자 프로필'}
        >
          <img
            className="w-full h-full object-cover"
            src={avatarSrc}
            alt={user?.name ? `${user.name} 프로필` : '프로필'}
            referrerPolicy={profileImageUrl ? 'no-referrer' : undefined}
            onError={(e) => {
              const target = e.target as HTMLImageElement
              if (profileImageUrl && !target.dataset.fallbackFromProfile) {
                target.dataset.fallbackFromProfile = '1'
                target.removeAttribute('referrerpolicy')
                target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.email || user?.name || 'user')}`
                return
              }
              target.src = 'https://via.placeholder.com/48'
            }}
          />
        </button>
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1.5 group w-full text-slate-500 hover:text-red-500 transition-all duration-200"
          title="로그아웃"
        >
          <div className="w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20">
            <span className="material-symbols-outlined text-2xl">logout</span>
          </div>
          <span className="text-[10px] font-semibold">로그아웃</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
