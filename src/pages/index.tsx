import React, { useState } from 'react';
import MySubscriptions from '../components/MySubscriptions';
import AllPopularTopics from '../components/AllPopularTopics';

type ActiveTab = 'subscribed' | 'popular';

const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('popular');

  return (
    <div>
      {/* Sub-tab Navigation */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('popular')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'popular' ? 'border-sky-600 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            전체 인기 토픽
          </button>
          <button
            onClick={() => setActiveTab('subscribed')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'subscribed' ? 'border-sky-600 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            내 구독
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'subscribed' && <MySubscriptions />}
        {activeTab === 'popular' && <AllPopularTopics />}
      </div>
    </div>
  );
};

export default HomePage;
