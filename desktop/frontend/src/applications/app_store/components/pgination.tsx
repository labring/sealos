import clsx from 'clsx';
import { useState } from 'react';
import styles from './pgination.module.scss';
import Iconfont from 'components/iconfont';

export type TPagination = {
  current: number; //当前页数
  pageSize: number; //每页条数
  total: number; //总数
  showTotal?: boolean;
  onChange: (page: number, pageSize: number) => void; //页码或 pageSize 改变的回调
  special?: boolean; //can only take one step back
};

/**
 * props TPagination
 * 总页数<=9条时全部展示
 * 当前页数减去4 <= 1,尾巴渲染省略...项及总分页数
 * 当前页数加上4 >=总页数,渲染分页总数-7的连号页码,头部渲染省略...项及第1页
 * 其余情况则头尾都渲染省略...项,第1页及总分页数,中间渲染页码。
 */
function Pagination(props: TPagination) {
  const { current = 1, pageSize, total, showTotal, onChange, special } = props;
  const [currentPage, setCurrentPage] = useState(current);
  const totalPageSize = Math.ceil(total / pageSize) || 1; //总分页数

  const pageChange = (cur: number) => {
    if (currentPage === cur) return;
    setCurrentPage(cur);
    onChange(cur, pageSize);
  };

  //下一页事件
  const nextPageChange = () => {
    if (currentPage === totalPageSize) return;
    pageChange(currentPage + 1);
  };

  //上一页事件
  const prePageChange = () => {
    if (currentPage === 1) return;
    pageChange(currentPage - 1);
  };

  //向前5页的省略号事件
  const preOmitPageChange = () => {
    pageChange(currentPage - 5);
  };

  //向后5页的省略号事件
  const nextOmitPageChange = () => {
    pageChange(currentPage + 5);
  };

  const firstPage = (
    <li
      key={'first' + Math.random()}
      onClick={() => {
        pageChange(1);
      }}
    >
      1
    </li>
  );

  const lastPage = (
    <li key={'last' + Math.random()} onClick={() => pageChange(totalPageSize)}>
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
      contentList = [
        firstPage,
        <PageOmit key={'omit' + Math.random()} onClick={preOmitPageChange} />
      ].concat(Array.from({ length: 9 - 2 }).map((_, i) => pageItem(i + totalPageSize - 9 + 3)));
    } else if (currentPage - 4 <= 1) {
      contentList = Array.from({ length: 9 - 2 })
        .map((_, i) => pageItem(i + 1))
        .concat([<PageOmit key={'omit' + Math.random()} onClick={nextOmitPageChange} />, lastPage]);
    } else {
      contentList = [
        firstPage,
        <PageOmit key={'omit' + Math.random()} title="向前5页" onClick={preOmitPageChange} />,
        ...Array.from({ length: 9 - 4 }).map((_, i) => pageItem(i + currentPage - 2)),
        <PageOmit key={'omit' + Math.random()} title="向后5页" onClick={nextOmitPageChange} />,
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
        <PageOmit key={'omit' + Math.random()} title="向前5页" onClick={preOmitPageChange} />
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
