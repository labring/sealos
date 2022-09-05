/* eslint-disable @next/next/no-img-element */

import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import request from 'services/request';
import styles from './index.module.scss';

export default function AppStore() {
  const { data, isLoading } = useQuery(['allApps'], () => request('/api/mock/getAllApps'));
  console.log(123, data);

  if (isLoading) {
    return <Spinner size={SpinnerSize.large} />;
  }

  const apps = data?.data || [];
  return (
    <div className="wnstore flex h-full">
      <div className={clsx(styles.storeNav, 'h-full w-24 flex flex-col')}>
        <div className={clsx(styles.uicon, 'prtclk')} data-action="sthome" data-payload="false">
          <svg
            aria-hidden="true"
            focusable="false"
            data-prefix="fas"
            data-icon="house"
            className="svg-inline--fa fa-house "
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 576 512"
            data-flip="false"
            data-invert="false"
            data-rounded="false"
            style={{ width: 20, height: 20 }}
          >
            <path
              fill="currentColor"
              d="M575.8 255.5C575.8 273.5 560.8 287.6 543.8 287.6H511.8L512.5 447.7C512.5 450.5 512.3 453.1 512 455.8V472C512 494.1 494.1 512 472 512H456C454.9 512 453.8 511.1 452.7 511.9C451.3 511.1 449.9 512 448.5 512H392C369.9 512 352 494.1 352 472V384C352 366.3 337.7 352 320 352H256C238.3 352 224 366.3 224 384V472C224 494.1 206.1 512 184 512H128.1C126.6 512 125.1 511.9 123.6 511.8C122.4 511.9 121.2 512 120 512H104C81.91 512 64 494.1 64 472V360C64 359.1 64.03 358.1 64.09 357.2V287.6H32.05C14.02 287.6 0 273.5 0 255.5C0 246.5 3.004 238.5 10.01 231.5L266.4 8.016C273.4 1.002 281.4 0 288.4 0C295.4 0 303.4 2.004 309.5 7.014L564.8 231.5C572.8 238.5 576.9 246.5 575.8 255.5L575.8 255.5z"
            />
          </svg>
        </div>
        <div className={clsx(styles.uicon, 'prtclk')} data-action="apprib" data-payload="false">
          <svg
            aria-hidden="true"
            focusable="false"
            data-prefix="fas"
            data-icon="table-cells-large"
            className="svg-inline--fa fa-table-cells-large "
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            data-flip="false"
            data-invert="false"
            data-rounded="false"
            style={{ width: 18, height: 18 }}
          >
            <path
              fill="currentColor"
              d="M448 32C483.3 32 512 60.65 512 96V416C512 451.3 483.3 480 448 480H64C28.65 480 0 451.3 0 416V96C0 60.65 28.65 32 64 32H448zM448 96H288V224H448V96zM448 288H288V416H448V288zM224 224V96H64V224H224zM64 416H224V288H64V416z"
            />
          </svg>
        </div>
        <div className={clsx(styles.uicon, 'prtclk')} data-action="gamerib" data-payload="false">
          <svg
            aria-hidden="true"
            focusable="false"
            data-prefix="fas"
            data-icon="gamepad"
            className="svg-inline--fa fa-gamepad "
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 512"
            data-flip="false"
            data-invert="false"
            data-rounded="false"
            style={{ width: 20, height: 20 }}
          >
            <path
              fill="currentColor"
              d="M448 64H192C85.96 64 0 149.1 0 256s85.96 192 192 192h256c106 0 192-85.96 192-192S554 64 448 64zM247.1 280h-32v32c0 13.2-10.78 24-23.98 24c-13.2 0-24.02-10.8-24.02-24v-32L136 279.1C122.8 279.1 111.1 269.2 111.1 256c0-13.2 10.85-24.01 24.05-24.01L167.1 232v-32c0-13.2 10.82-24 24.02-24c13.2 0 23.98 10.8 23.98 24v32h32c13.2 0 24.02 10.8 24.02 24C271.1 269.2 261.2 280 247.1 280zM431.1 344c-22.12 0-39.1-17.87-39.1-39.1s17.87-40 39.1-40s39.1 17.88 39.1 40S454.1 344 431.1 344zM495.1 248c-22.12 0-39.1-17.87-39.1-39.1s17.87-40 39.1-40c22.12 0 39.1 17.88 39.1 40S518.1 248 495.1 248z"
            />
          </svg>
        </div>
        <div className={clsx(styles.uicon, 'prtclk')} data-action="movrib" data-payload="false">
          <svg
            aria-hidden="true"
            focusable="false"
            data-prefix="fas"
            data-icon="film"
            className="svg-inline--fa fa-film "
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            data-flip="false"
            data-invert="false"
            data-rounded="false"
            style={{ width: 20, height: 20 }}
          >
            <path
              fill="currentColor"
              d="M463.1 32h-416C21.49 32-.0001 53.49-.0001 80v352c0 26.51 21.49 48 47.1 48h416c26.51 0 48-21.49 48-48v-352C511.1 53.49 490.5 32 463.1 32zM111.1 408c0 4.418-3.582 8-8 8H55.1c-4.418 0-8-3.582-8-8v-48c0-4.418 3.582-8 8-8h47.1c4.418 0 8 3.582 8 8L111.1 408zM111.1 280c0 4.418-3.582 8-8 8H55.1c-4.418 0-8-3.582-8-8v-48c0-4.418 3.582-8 8-8h47.1c4.418 0 8 3.582 8 8V280zM111.1 152c0 4.418-3.582 8-8 8H55.1c-4.418 0-8-3.582-8-8v-48c0-4.418 3.582-8 8-8h47.1c4.418 0 8 3.582 8 8L111.1 152zM351.1 400c0 8.836-7.164 16-16 16H175.1c-8.836 0-16-7.164-16-16v-96c0-8.838 7.164-16 16-16h160c8.836 0 16 7.162 16 16V400zM351.1 208c0 8.836-7.164 16-16 16H175.1c-8.836 0-16-7.164-16-16v-96c0-8.838 7.164-16 16-16h160c8.836 0 16 7.162 16 16V208zM463.1 408c0 4.418-3.582 8-8 8h-47.1c-4.418 0-7.1-3.582-7.1-8l0-48c0-4.418 3.582-8 8-8h47.1c4.418 0 8 3.582 8 8V408zM463.1 280c0 4.418-3.582 8-8 8h-47.1c-4.418 0-8-3.582-8-8v-48c0-4.418 3.582-8 8-8h47.1c4.418 0 8 3.582 8 8V280zM463.1 152c0 4.418-3.582 8-8 8h-47.1c-4.418 0-8-3.582-8-8l0-48c0-4.418 3.582-8 7.1-8h47.1c4.418 0 8 3.582 8 8V152z"
            />
          </svg>
        </div>
        <div className={clsx(styles.uicon, 'prtclk')} data-action="page1" data-payload="true">
          <svg
            aria-hidden="true"
            focusable="false"
            data-prefix="fas"
            data-icon="download"
            className="svg-inline--fa fa-download "
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            data-flip="false"
            data-invert="false"
            data-rounded="false"
            style={{ width: 20, height: 20 }}
          >
            <path
              fill="currentColor"
              d="M480 352h-133.5l-45.25 45.25C289.2 409.3 273.1 416 256 416s-33.16-6.656-45.25-18.75L165.5 352H32c-17.67 0-32 14.33-32 32v96c0 17.67 14.33 32 32 32h448c17.67 0 32-14.33 32-32v-96C512 366.3 497.7 352 480 352zM432 456c-13.2 0-24-10.8-24-24c0-13.2 10.8-24 24-24s24 10.8 24 24C456 445.2 445.2 456 432 456zM233.4 374.6C239.6 380.9 247.8 384 256 384s16.38-3.125 22.62-9.375l128-128c12.49-12.5 12.49-32.75 0-45.25c-12.5-12.5-32.76-12.5-45.25 0L288 274.8V32c0-17.67-14.33-32-32-32C238.3 0 224 14.33 224 32v242.8L150.6 201.4c-12.49-12.5-32.75-12.5-45.25 0c-12.49 12.5-12.49 32.75 0 45.25L233.4 374.6z"
            />
          </svg>
        </div>
      </div>

      <div className={clsx(styles.pagecont, 'w-full relative box-border p-12 m-12')}>
        <div className="flex">
          <div className={clsx(styles.catbtn, 'handcr')}>All</div>
          <div className={clsx(styles.catbtn, 'handcr')}>Apps</div>
          <div className={clsx(styles.catbtn, 'handcr')}>Games</div>
          <div className={clsx(styles.catbtn, 'absolute right-0 mr-4')}>
            <a href="https://github.com/win11react/store" target="_blank" rel="noreferrer">
              Add your own app
            </a>
          </div>
        </div>

        <div className={clsx(styles.appscont, 'mt-8')}>
          {apps.map((item: any, i: number) => {
            return (
              <div key={i} className={clsx(styles.ribcont, styles.ltShad, 'p-4 pt-8 prtclk')}>
                <div
                  className={clsx(styles.imageCont, 'prtclk mx-4 mb-6 rounded')}
                  data-back="false"
                >
                  <img
                    width={100}
                    height={100}
                    data-free="false"
                    src="https://raw.githubusercontent.com/blueedgetechno/win11React/master/public/img/icon/code.png"
                    alt=""
                  />
                </div>

                <div className="capitalize font-semibold">{item.name}</div>
                <div className="capitalize  text-gray-600">{item.type}</div>
                <div className="flex items-center mt-2">
                  <img
                    alt="name"
                    width="20"
                    src="https://i.pravatar.cc/150?u=a04258114e29026702d"
                  />
                  <div className="text-xss">30k</div>
                </div>
                <div className="text-xss mt-8">{'Free'}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
