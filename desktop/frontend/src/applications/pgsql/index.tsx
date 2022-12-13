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
    <PgSqlPageContext.Provider value={{ toPage } as any}>
      {pageId === PageType.FrontPage ? <FrontPage /> : null}
      {pageId === PageType.AddPage ? <AddPage /> : null}
    </PgSqlPageContext.Provider>
  );
}

export const generatePgsqlTemplate = (pgsqlForm: any) => {
  let user = '';
  pgsqlForm.users.forEach((item: any) => {
    user += `${item}: []\n\t`;
  });
  let dataBase = '';
  pgsqlForm.dataBases.forEach((item: any) => {
    dataBase += `${item.name}: ${item.user}\n\t`;
  });

  const text = `\`\`\`yaml
kind: "postgresql"
apiVersion: "acid.zalan.do/v1"

metadata:
  name: "acid-${pgsqlForm.pgsqlName}"
  labels:
    team: acid

spec:
  teamId: "acid"
  postgresql:
    version: ${pgsqlForm.version}
  numberOfInstances: ${pgsqlForm.instance}
  volume:
    size: ${pgsqlForm.volumeSize}Gi

  users:
    ${user}
  databases:
    ${dataBase}
  resources:
    requests:
      cpu: ${pgsqlForm.limits.cpu}m
      memory: ${pgsqlForm.limits.memory}Mi
    limits:
      cpu: ${pgsqlForm.limits.cpu}m
      memory: ${pgsqlForm.limits.memory}Mi
\`\`\``;
  return text;
};

export function usePgSqlContext() {
  return useContext(PgSqlPageContext);
}
