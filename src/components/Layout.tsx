import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useChatroomAdmin } from '../context/ChatroomAdminContext'; // Import useChatroomAdmin

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useChatroomAdmin(); // Import useChatroomAdmin
  const router = useRouter();
  const { id } = router.query; // Get chatroom ID from router query
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hideNav, setHideNav] = useState(false); // State to control nav visibility

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } = { session: null } } = await supabase.auth.getSession(); // Added default value for session
      setIsLoggedIn(!!session);
    };
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Check if current path is a chatroom page (e.g., /chat/some-id)
    const isChatroomPage = router.pathname.startsWith('/chat/') && router.pathname.split('/').length === 3;
    setHideNav(isChatroomPage);
  }, [router.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login'); // Redirect to login page after logout
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const menuButton = document.querySelector('[aria-controls="mobile-menu"]');
      const menu = document.querySelector('[role="menu"]');
      const target = event.target as HTMLElement;

      if (isMenuOpen && menuButton && menu && !menuButton.contains(target) && !menu.contains(target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const navItems = [
    { href: '/', label: '홈' },
    { href: '/chat', label: '채팅' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      
      <nav className={`bg-white shadow-md w-full ${hideNav ? 'hidden' : ''}`}>
        <div className="flex justify-around items-center"> 
          {navItems.map((item) => (
            <Link key={item.label} href={item.href}>
              <div className={`py-3 px-2 block text-center text-base md:text-lg font-medium cursor-pointer ${ (item.href === '/' ? router.pathname === item.href : router.pathname.startsWith(item.href)) ? 'border-b-4 border-blue-500 text-blue-500' : 'text-gray-500 hover:text-blue-500'}`}>
                {item.label}
              </div>
            </Link>
          ))}
          {isLoggedIn && (
            <div className="relative ml-auto z-50"> 
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                aria-controls="mobile-menu"
                aria-expanded={isMenuOpen}
              >
                <span className="sr-only">메인 메뉴 열기</span>
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {isMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button">
                  <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
                    프로필
                  </Link>
                  {isAdmin && id && (
                    <Link href={`/chat/${id}/settings`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
                      채팅방 설정
                    </Link>
                  )}
                  <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <main className="p-2 md:p-4">{children}</main>
    </div>
  );
};

export default Layout;
