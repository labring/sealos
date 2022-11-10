import { useState } from 'react';
import AddPage from './add_page';
import DetailPage from './detail_page';
import FrontPage from './front_page';
function Infra() {
  const [page, setPage] = useState(1);
  const [infraName, setName] = useState('');
  const [editName, setEditName] = useState('');

  const action = (page: number) => {
    setPage(page);
  };

  const toDetailByName = (name: string) => {
    setPage(3);
    setName(name);
  };

  const toEditByName = (name: string) => {
    setPage(2);
    setEditName(name);
  };

  const toAddPage = (name: string) => {
    setPage(2);
    setEditName('');
  };

  return (
    <>
      {page === 1 ? (
        <FrontPage action={action} toDetailByName={toDetailByName} toAddPage={toAddPage} />
      ) : null}

      {page === 2 ? (
        <AddPage action={action} edit_name={editName} toDetailByName={toDetailByName} />
      ) : null}

      {page === 3 ? (
        <DetailPage action={action} infraName={infraName} toEditByName={toEditByName} />
      ) : null}
    </>
  );
}

export default Infra;
