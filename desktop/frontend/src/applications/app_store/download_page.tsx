/* eslint-disable @next/next/no-img-element */
import { TApp } from 'stores/app';
import styles from './index.module.scss';
import clsx from 'clsx';

const DownPage = ({
  action,
  apps
}: {
  action: (param: { page: string; appIdentifier: string }) => void;
  apps: TApp[];
}) => {
  return (
    <div className={clsx(styles.pagecont, 'w-full absolute box-border p-12 pt-6 mt-8')}>
      <div className={clsx(styles.appscont, 'mt-8')}>
        {apps.map((item: any, i: number) => {
          return (
            <div
              key={i}
              className={clsx(styles.ribcont, styles.ltShad, 'p-4 pt-8 prtclk')}
              data-action="page2"
              data-payload={item.data.url}
              onClick={() => action({ page: 'page2', appIdentifier: item.data.url })}
            >
              <div className={clsx(styles.imageCont, 'prtclk mx-4 mb-6 rounded')} data-back="false">
                <img
                  width={100}
                  height={100}
                  data-free="false"
                  src={
                    item.icon ||
                    'https://raw.githubusercontent.com/blueedgetechno/win11React/master/public/img/icon/code.png'
                  }
                  alt=""
                />
              </div>

              <div className="capitalize font-semibold">{item.name}</div>
              <div className="capitalize  text-gray-600">{item.type}</div>
              <div className="flex items-center mt-2">
                <img
                  alt="name"
                  width="20"
                  height="20"
                  src={item.icon || 'https://i.pravatar.cc/150?u=a04258114e29026702d'}
                />
                <div className="text-xss pl-8">30k</div>
              </div>
              <div className="text-xss mt-8">{item.size}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DownPage;
