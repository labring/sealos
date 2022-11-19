import { createContext, useContext, useState } from 'react';
import AddPage from './add_page';
import DetailPage from './detail_page';
import FrontPage from './front_page';

export enum PageType {
  FrontPage,
  AddPage,
  DetailPage
}

type ScpStore = {
  infraName: string;
  toPage: (pageId: PageType, infraName: string) => void;
};

const ScpPageContext = createContext({} as ScpStore);

function Infra() {
  const [pageId, setPageId] = useState(PageType.FrontPage);
  const [infraName, setInfraName] = useState('');
  const toPage = function (pageId: PageType, infraName: string) {
    setPageId(pageId);
    setInfraName(infraName);
  };

  return (
    <ScpPageContext.Provider value={{ infraName, toPage } as any}>
      {pageId === PageType.FrontPage ? <FrontPage /> : null}

      {pageId === PageType.AddPage ? <AddPage /> : null}

      {pageId === PageType.DetailPage ? <DetailPage /> : null}
    </ScpPageContext.Provider>
  );
}

export function useScpContext() {
  return useContext(ScpPageContext);
}
export default Infra;
