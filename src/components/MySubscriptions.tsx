import React, { useState } from 'react';

type FilterType = 'summary' | 'favorites';

// Mock Data for Subscribed Content
const subscribedSummaries = [
  {
    chatroomName: '건강상담소',
    summary: '최근 24시간 동안 비타민 D 결핍과 보충제의 효과에 대한 논의가 활발했습니다. 대부분의 참여자들은 하루 2000IU 이상 섭취하는 것을 권장했으며, 일부는 주사 요법의 경험을 공유했습니다...',
  },
  {
    chatroomName: '4050 건강채널',
    summary: '어제 저녁, 혈당 스파이크를 줄이는 식단에 대한 정보가 공유되었습니다. 식후 가벼운 산책과 식이섬유가 풍부한 채소를 먼저 섭취하는 방법이 좋은 반응을 얻었습니다...',
  },
];

const favoritePosts = [
  {
    chatroomName: '영양제포럼',
    summary: '[저장됨] 마그네슘 글리시네이트와 트레오네이트의 차이점 및 불면증에 더 효과적인 형태에 대한 심층 분석글입니다...',
  },
];

const SubscriptionCard = ({ chatroomName, summary }: { chatroomName: string; summary: string; }) => (
  <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
    <div className="mb-2">
      <span className="text-sm font-semibold text-gray-500">{chatroomName}</span>
    </div>
    <p className="text-gray-700">{summary}</p>
  </div>
);

const MySubscriptions: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('summary');

  const content = activeFilter === 'summary' ? subscribedSummaries : favoritePosts;

  return (
    <div>
      {/* Filter Buttons */}
      <div className="flex items-center space-x-2 mb-4">
        <button 
          onClick={() => setActiveFilter('summary')}
          className={`px-4 py-2 text-sm font-semibold rounded-full ${activeFilter === 'summary' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
          요약글
        </button>
        <button 
          onClick={() => setActiveFilter('favorites')}
          className={`px-4 py-2 text-sm font-semibold rounded-full ${activeFilter === 'favorites' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
          즐겨찾기
        </button>
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        {content.length > 0 ? (
          content.map((item, index) => (
            <SubscriptionCard key={`${activeFilter}-${index}`} {...item} />
          ))
        ) : (
          <p className="text-gray-500 p-4 text-center">표시할 내용이 없습니다.</p>
        )}
      </div>
    </div>
  );
};

export default MySubscriptions;
