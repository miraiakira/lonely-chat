import { RouterProvider } from 'react-router-dom';
import router from './router';
import { useAuthStore } from './store/authStore';
import { useEffect } from 'react';
import { getMenus, getMe } from './services/api';
import { useMenuStore } from './store/menuStore';
import { useUserStore } from './store/userStore';

function App() {
  const { token } = useAuthStore();
  const { setMenus } = useMenuStore();
  const { setUser } = useUserStore();

  // 将缺失的管理员菜单按需注入到本地菜单（仅对 admin 角色生效，且避免重复）
  const ensureAdminMenus = (menus: any[], user: any) => {
    const hasAdmin = Array.isArray(user?.roles) && user.roles.some((r: any) => r?.name === 'admin');
    if (!hasAdmin) return menus;
    const exists = (p: string) =>
      (menus || []).some((m: any) => m?.path === p || (Array.isArray(m?.children) && m.children.some((c: any) => c?.path === p)));

    const needed = [
      { path: '/admin/messages', title: '聊天消息' },
      { path: '/admin/users', title: '聊天用户' },
      { path: '/admin/conversations', title: '聊天会话' },
    ];

    const missing = needed.filter((n) => !exists(n.path));
    if (missing.length === 0) return menus;

    const idx = (menus || []).findIndex((m: any) => m?.path === '/admin');
    if (idx >= 0) {
      const next = [...menus];
      const parent = { ...(next[idx] || {}) };
      parent.children = [...(Array.isArray(parent.children) ? parent.children : []), ...missing];
      next[idx] = parent;
      return next;
    }

    return [
      ...(menus || []),
      {
        id: 9999,
        title: '聊天管理',
        path: '/admin',
        icon: 'SafetyOutlined',
        children: missing,
      },
    ];
  };

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      if (!token) {
        setMenus([]);
        setUser(null);
        return;
      }
      try {
        const [menusRes, user] = await Promise.all([getMenus(), getMe()]);
        if (!cancelled) {
          let menuArray: any[] = [];
          if (Array.isArray(menusRes)) {
            menuArray = menusRes as any[];
          } else if (menusRes && Array.isArray((menusRes as any).menus)) {
            menuArray = (menusRes as any).menus as any[];
          }

          // 若用户为管理员，确保“聊天管理”菜单存在
          const finalMenus = ensureAdminMenus(menuArray, user);
          setMenus(finalMenus);
          setUser(user ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setMenus([]);
          setUser(null);
        }
      }
    };
    loadData();
    return () => {
      cancelled = true;
    };
  }, [token, setMenus, setUser]);

  return <RouterProvider router={router} />;
}

export default App;