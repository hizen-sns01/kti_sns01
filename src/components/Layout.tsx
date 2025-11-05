import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useRouter } from 'next/router';
import Link from 'next/link';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Moved here

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login'); // Redirect to login page after logout
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click is outside the menu and the button
      const menuButton = document.querySelector('[aria-controls="mobile-menu"]');
      const menu = document.querySelector('[role="menu"]');

      // Cast event.target to HTMLElement for contains method
      const target = event.target as HTMLElement;

      if (isMenuOpen && menuButton && menu && !menuButton.contains(target) && !menu.contains(target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]); // Only re-run if isMenuOpen changes

  const navItems = [
    { href: '/', label: '홈' },
    { href: '/chat', label: '채팅' },
    // Removed '/profile' from here
  ];

  return (
    // Add a max-width for mobile and center it, allowing it to grow on larger screens
    <div className="max-w-2xl mx-auto">
      <header className="bg-gray-800 text-white p-3 md:p-4 flex justify-between items-center relative z-10"> {/* Added relative z-10 for dropdown positioning */}
        <h1 className="text-lg md:text-xl font-bold cursor-pointer" onClick={() => router.push('/chat')}>SNS App</h1>
        {isLoggedIn && (
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
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
                <Link href="/chatroom-settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
                  채팅방 설정
                </Link>
                <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
                  로그아웃
                </button>
              </div>
            )}
          </div>
        )}
      </header>
      
      {/* For mobile, a bottom navigation is often better, but for now let's adjust the top nav */}
      <nav className="bg-white shadow-md">
        <div className="container mx-auto flex justify-around">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href}>
              {/* Adjust padding and font size for mobile */}
              <div className={`py-3 px-2 block text-center text-base md:text-lg font-medium cursor-pointer ${ (item.href === '/' ? router.pathname === item.href : router.pathname.startsWith(item.href)) ? 'border-b-4 border-blue-500 text-blue-500' : 'text-gray-500 hover:text-blue-500'}`}>
                {item.label}
              </div>
            </Link>
          ))}
        </div>
      </nav>

      {/* Adjust padding for mobile */}
      <main className="p-2 md:p-4">{children}</main>
    </div>
  );
};

export default Layout;
