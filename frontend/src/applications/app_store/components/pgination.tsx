import clsx from 'clsx';
import { useState } from 'react';
import styles from './pgination.module.scss';
import Iconfont from 'components/iconfont';

export type TPagination = {
  defaultCurrent: number; // current page count
  pageSize: number; // quantity per page
  total: number; // total
  showTotal?: boolean;
  onChange: (page: number, pageSize: number) => void; // Callback that change the page number or pageSize
  special?: boolean; //can only take one step back
};

function Pagination(props: TPagination) {
  const { defaultCurrent = 1, pageSize, total, showTotal, onChange, special } = props;
  const [currentPage, setCurrentPage] = useState(defaultCurrent);
  const totalPageSize = Math.ceil(total / pageSize) || 1;

  let centerPages: number[] = [];
  const centerSize = 5;
  const jumpSize = centerSize;
  const startEllipsisSize = centerSize + 3;

  const updateCenterPage = () => {
    let centerPage = currentPage;
    if (currentPage > totalPageSize - 3) {
      centerPage = totalPageSize - 3;
    }
    if (currentPage < 4) {
      centerPage = 4;
    }
    if (totalPageSize <= centerSize + 2) {
      let temp = [];
      for (let i = 2, len = totalPageSize; i < len; i++) {
        temp.push(i);
      }
      centerPages = temp;
    } else {
      centerPages = [centerPage - 2, centerPage - 1, centerPage, centerPage + 1, centerPage + 2];
    }
  };

  updateCenterPage();

  const pageChange = (cur: number) => {
    if (currentPage === cur) return;
    setCurrentPage(cur);
    onChange(cur, pageSize);
  };

  // next page
  const nextPageChange = () => {
    if (currentPage === totalPageSize) return;
    pageChange(currentPage + 1);
  };

  // previous page
  const prePageChange = () => {
    if (currentPage === 1) return;
    pageChange(currentPage - 1);
  };

  // First 5 pages
  const preOmitPageChange = () => {
    let newPage = currentPage - jumpSize;
    if (newPage < 1) {
      newPage = 1;
    }
    pageChange(newPage);
  };

  // Back 5 pages
  const nextOmitPageChange = () => {
    let newPage = currentPage + jumpSize;
    if (newPage > totalPageSize) {
      newPage = totalPageSize;
    }
    pageChange(newPage);
  };

  const firstPage = (
    <li
      key={'first'}
      className={clsx({ [styles.pageItemActive]: currentPage === 1 })}
      onClick={() => {
        pageChange(1);
      }}
    >
      1
    </li>
  );

  const lastPage = (
    <li
      key={'last'}
      onClick={() => pageChange(totalPageSize)}
      className={clsx({ [styles.pageItemActive]: currentPage === totalPageSize })}
    >
      {totalPageSize}
    </li>
  );

  const pageItem = (currentValue: number) => {
    return (
      <li
        onClick={() => pageChange(currentValue)}
        className={clsx({ [styles.pageItemActive]: currentPage === currentValue })}
        key={'item' + currentValue}
      >
        {currentValue}
      </li>
    );
  };

  const PageOmit = (props: any) => {
    return (
      <li title={props.title} onClick={props.onClick}>
        ...
      </li>
    );
  };

  const initPage = () => {
    return (
      <>
        {firstPage}

        {currentPage >= centerSize && totalPageSize >= startEllipsisSize && (
          <PageOmit key={'omit-pre'} title="向前5页" onClick={preOmitPageChange} />
        )}

        {centerPages.map((page) => pageItem(page))}

        {currentPage <= totalPageSize - centerSize + 1 && totalPageSize >= startEllipsisSize && (
          <PageOmit key={'omit-next'} title="向后5页" onClick={nextOmitPageChange} />
        )}

        {lastPage}
      </>
    );
  };

  const initSecialPage = () => {
    const smallPage = Array.from({ length: currentPage }).map((_, i) => pageItem(i + 1));
    const largePage = (
      <>
        {firstPage}
        <PageOmit key={'omit-pre'} title="向前5页" onClick={preOmitPageChange} />
        {Array.from({ length: 3 }).map((_, i) => pageItem(i + currentPage - 2))}
      </>
    );
    return <>{currentPage < 6 ? smallPage : largePage}</>;
  };

  return (
    <div className={styles.pageContainer}>
      <ul className={styles.pageWrapper}>
        <li
          key={'<'}
          onClick={prePageChange}
          className={clsx({ [styles.disabled]: currentPage === 1 })}
        >
          <Iconfont iconName="icon-left" color="#0D1A2D" width={28} height={28} />
        </li>
        {special ? initSecialPage() : initPage()}
        <li
          key={'>'}
          onClick={nextPageChange}
          className={clsx({ [styles.disabled]: currentPage === totalPageSize })}
        >
          <Iconfont iconName="icon-right" color="#0D1A2D" width={28} height={28} />
        </li>
      </ul>
      {showTotal && (
        <span style={{ color: `#333`, marginRight: `.5em`, marginLeft: `1em` }}>共{total}条</span>
      )}
      {special && '共' + totalPageSize + '页'}
    </div>
  );
}

export default Pagination;
