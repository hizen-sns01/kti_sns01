import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ChatroomAdminContextType {
  isAdmin: boolean;
  setAdminStatus: (status: boolean) => void;
}

const ChatroomAdminContext = createContext<ChatroomAdminContextType | undefined>(undefined);

export const ChatroomAdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);

  const setAdminStatus = (status: boolean) => {
    setIsAdmin(status);
  };

  return (
    <ChatroomAdminContext.Provider value={{ isAdmin, setAdminStatus }}>
      {children}
    </ChatroomAdminContext.Provider>
  );
};

export const useChatroomAdmin = () => {
  const context = useContext(ChatroomAdminContext);
  if (context === undefined) {
    throw new Error('useChatroomAdmin must be used within a ChatroomAdminProvider');
  }
  return context;
};
