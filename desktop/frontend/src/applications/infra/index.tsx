import { useState } from 'react';
import AddPage from './add_page';
import DetailPage from './detail_page';
import FrontPage from './front_page';
function Infra() {
  const [page, setPage] = useState(1);
  const [infraName, setInfraName] = useState('');

  const toAddPage = () => {
    setPage(2);
    setInfraName('');
  };

  const toDetailPageByName = (name: string) => {
    setPage(3);
    setInfraName(name);
  };

  const toEditPageByName = (name: string) => {
    setPage(2);
    setInfraName(name);
  };

  const backFront = () => {
    setPage(1);
    setInfraName('');
  };

  const backEdtail = (name: string) => {
    setPage(3);
    setInfraName(name);
  };

  return (
    <>
      {page === 1 ? (
        <FrontPage toAddPage={toAddPage} toDetailPageByName={toDetailPageByName} />
      ) : null}

      {page === 2 ? (
        <AddPage editName={infraName} backFront={backFront} backEdtail={backEdtail} />
      ) : null}

      {page === 3 ? (
        <DetailPage
          infraName={infraName}
          toEditPageByName={toEditPageByName}
          backFront={backFront}
        />
      ) : null}
    </>
  );
}

export default Infra;
