import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useRouter } from 'next/router';
import Link from 'next/link';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
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

  const navItems = [
    { href: '/', label: '홈' },
    { href: '/chat', label: '채팅' },
    { href: '/profile', label: '프로필' },
  ];

  return (
    // Add a max-width for mobile and center it, allowing it to grow on larger screens
    <div className="max-w-2xl mx-auto">
      <header className="bg-gray-800 text-white p-3 md:p-4 flex justify-between items-center">
        <h1 className="text-lg md:text-xl font-bold cursor-pointer" onClick={() => router.push('/chat')}>SNS App</h1>
        {isLoggedIn && (
          <button
            onClick={handleLogout}
            // Adjust padding and font size for mobile
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 md:py-2 md:px-4 rounded text-sm md:text-base"
          >
            로그아웃
          </button>
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
