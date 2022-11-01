import { useState } from 'react';
import AddPage from './add_page';
import DetailPage from './detail_page';
import FrontPage from './front_page';
function Infra() {
  const [page, setPage] = useState(1);
  const [infraName, setName] = useState('');

  const action = (page: number) => {
    setPage(page);
  };

  const toDetailByName = (name: string) => {
    setPage(3);
    setName(name);
  };

  return (
    <>
      {page === 1 ? <FrontPage action={action} toDetailByName={toDetailByName} /> : null}
      {page === 2 ? <AddPage action={action} /> : null}
      {page === 3 ? <DetailPage action={action} infraName={infraName} /> : null}
    </>
  );
}

export default Infra;
