import React, { useState } from 'react';
import SubscribedPosts from '../components/SubscribedPosts';
import PopularPosts from '../components/PopularPosts';

type ActiveTab = 'subscribed' | 'popular';

const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('subscribed');

  return (
    <div>
      {/* Sub-tab Navigation */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('subscribed')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'subscribed' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            구독글
          </button>
          <button
            onClick={() => setActiveTab('popular')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'popular' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            인기글
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'subscribed' && <SubscribedPosts />}
        {activeTab === 'popular' && <PopularPosts />}
      </div>
    </div>
  );
};

export default HomePage;
