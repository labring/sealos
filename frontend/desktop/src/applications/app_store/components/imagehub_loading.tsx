import React from 'react';
import ContentLoader from 'react-content-loader';

const CardLoading = ({ width, height }: { width: number; height: number }) => (
  <ContentLoader
    speed={2}
    width={width}
    height={height}
    viewBox="0 0 600 160"
    backgroundColor="#d9e2ef"
    foregroundColor="#daebfa"
  >
    <rect x="155" y="30" rx="8" ry="8" width="120" height="20" />
    <circle cx="75" cy="80" r="55" />
    <rect x="156" y="60" rx="8" ry="8" width="300" height="12" />
    <rect x="156" y="80" rx="8" ry="8" width="300" height="12" />
  </ContentLoader>
);

const ListContextLoading = () => {
  const count = ['one', 'two', 'three', 'four', 'five'];
  const cardStyle = {
    background: 'rgba(255, 255, 255, 0.75)',
    borderRadius: '12px',
    height: '160px'
  };
  return (
    <div className="flex flex-col space-y-4 absolute w-full pb-8">
      {count.map((i) => {
        return (
          <div className={'mr-8'} style={cardStyle} key={i}>
            <CardLoading width={500} height={160} />
          </div>
        );
      })}
    </div>
  );
};

const ImageMarkdownLoading = () => {
  return (
    <ContentLoader
      speed={2}
      width={500}
      height={160}
      viewBox="0 0 600 160"
      backgroundColor="#d9e2ef"
      foregroundColor="#daebfa"
    >
      <rect x="0" y="20" rx="8" ry="8" width="500" height="12" />
      <rect x="0" y="40" rx="8" ry="8" width="500" height="12" />
      <rect x="0" y="60" rx="8" ry="8" width="300" height="12" />
    </ContentLoader>
  );
};

const ImageTagsLoading = () => {
  const count = ['one', 'two', 'three'];
  const cardStyle = {
    background: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '12px'
  };
  return (
    <div className="space-y-2 mt-4">
      {count.map((i) => {
        return (
          <div style={cardStyle} key={i}>
            <ContentLoader
              speed={2}
              width={100}
              height={42}
              backgroundColor="#d9e2ef"
              foregroundColor="#daebfa"
            >
              <rect x="30" y="15" rx="8" ry="8" width="64" height="12" />
            </ContentLoader>
          </div>
        );
      })}
    </div>
  );
};

export { CardLoading, ListContextLoading, ImageMarkdownLoading, ImageTagsLoading };
