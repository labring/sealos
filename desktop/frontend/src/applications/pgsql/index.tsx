import { createContext, useContext, useState } from 'react';
import AddPage from './add_page';
import FrontPage from './front_page';

export enum PageType {
  FrontPage,
  AddPage
}

type PgSqlStore = {
  toPage: (pageId: PageType) => void;
};

const PgSqlPageContext = createContext({} as PgSqlStore);

export default function PgSql() {
  const [pageId, setPageId] = useState(PageType.FrontPage);
  const toPage = function (pageId: PageType) {
    setPageId(pageId);
  };

  return (
    <PgSqlPageContext.Provider value={{ toPage }}>
      {pageId === PageType.FrontPage ? <FrontPage /> : null}
      {pageId === PageType.AddPage ? <AddPage /> : null}
    </PgSqlPageContext.Provider>
  );
}

export function usePgSqlContext() {
  return useContext(PgSqlPageContext);
}
