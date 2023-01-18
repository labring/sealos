import clsx from 'clsx';
import { useState } from 'react';
import styles from './pgination.module.scss';
import Iconfont from 'components/iconfont';

export type TPagination = {
  current: number; // current page count
  pageSize: number; // quantity per page
  total: number; // total
  showTotal?: boolean;
  onChange: (page: number, pageSize: number) => void; // Callback that change the page number or pageSize
  special?: boolean; //can only take one step back
};

/**
 * props TPagination
 * All pages are displayed when the total number of pages is less than or equal to nine.
 * Current page count minus four is less than or equal to one tail render omit... Item and total number of pages.
 * The current number of pages plus four is greater than or equal to the total number of pages, the total number of render pages minus the numbered page number of 7, header rendering omitted... Item and page 1.
 * For the rest of the case, both ends are rendered and omitted... Item, page 1 and total number of pages, intermediate render page number.
 */
function Pagination(props: TPagination) {
  const { current = 1, pageSize, total, showTotal, onChange, special } = props;
  const [currentPage, setCurrentPage] = useState(current);
  const totalPageSize = Math.ceil(total / pageSize) || 1;

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
    pageChange(currentPage - 5);
  };

  // Back 5 pages
  const nextOmitPageChange = () => {
    pageChange(currentPage + 5);
  };

  const firstPage = (
    <li
      key={'first'}
      onClick={() => {
        pageChange(1);
      }}
    >
      1
    </li>
  );

  const lastPage = (
    <li key={'last'} onClick={() => pageChange(totalPageSize)}>
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
    let contentList: any = [];
    if (totalPageSize <= 9) {
      contentList = Array.from({ length: totalPageSize }).map((_, i) => pageItem(i + 1));
    } else if (currentPage + 4 >= totalPageSize) {
      contentList = [firstPage, <PageOmit key={'omit-pre'} onClick={preOmitPageChange} />].concat(
        Array.from({ length: 9 - 2 }).map((_, i) => pageItem(i + totalPageSize - 9 + 3))
      );
    } else if (currentPage - 4 <= 1) {
      contentList = Array.from({ length: 9 - 2 })
        .map((_, i) => pageItem(i + 1))
        .concat([<PageOmit key={'omit-next'} onClick={nextOmitPageChange} />, lastPage]);
    } else {
      contentList = [
        firstPage,
        <PageOmit key={'omit-before'} title="向前5页" onClick={preOmitPageChange} />,
        ...Array.from({ length: 9 - 4 }).map((_, i) => pageItem(i + currentPage - 2)),
        <PageOmit key={'omit-back'} title="向后5页" onClick={nextOmitPageChange} />,
        lastPage
      ];
    }
    return contentList;
  };

  const initSecialPage = () => {
    let contentList: any = [];
    if (currentPage <= 6) {
      contentList = Array.from({ length: currentPage }).map((_, i) => pageItem(i + 1));
    } else {
      contentList = [
        firstPage,
        <PageOmit key={'omit-pre'} title="向前5页" onClick={preOmitPageChange} />
      ].concat(Array.from({ length: 3 }).map((_, i) => pageItem(i + currentPage - 2)));
    }
    return contentList;
  };

  return (
    <div className={styles.pageContainer}>
      {showTotal && (
        <span style={{ color: `#333`, marginRight: `.5em`, marginLeft: `1em` }}>共{total}条</span>
      )}
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
      {special && '共' + totalPageSize + '页'}
    </div>
  );
}

export default Pagination;
