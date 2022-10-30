/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from 'react';
import useAppStore, { TApp } from 'stores/app';
import styles from './front_page.module.scss';
import clsx from 'clsx';
import Icon from 'components/icons';

const FrontPage = () => {
  // const ribbon = useSelector(state => state.globals.ribbon)
  // const apprib = useSelector(state => state.globals.apprib)
  // const gamerib = useSelector(state => state.globals.gamerib)
  // const movrib = useSelector(state => state.globals.movrib)
  const { allApps: apps, getAllApps } = useAppStore(({ allApps, getAllApps }) => ({
    allApps,
    getAllApps
  }));
  const ribbon = apps.slice(0, 6);
  const apprib = ribbon;
  const gamerib = ribbon;
  const movrib = ribbon;
  return (
    <div className="pagecont w-full absolute top-0">
      <div
        id="apprib"
        className={clsx(
          styles.amzApps,
          styles.frontCont,
          ' my-8 py-20 w-auto mx-8 \
        flex justify-between noscroll overflow-x-scroll overflow-y-hidden'
        )}
      >
        <div className="flex w-64 flex-col text-gray-100 h-full px-8  ">
          <div className="text-xl">{'store.featured-app'}</div>
          <div className="text-xs mt-2">{'store.featured-app.info'}</div>
        </div>
        <div className="flex w-max pr-8">
          {apprib &&
            apprib.map((x, i) => {
              let stars = 6;
              return (
                <div key={i} className={clsx(styles.ribcont, ' rounded my-auto p-2 pb-2')}>
                  <img
                    alt=""
                    className="mx-1 py-1 mb-2 rounded"
                    width={120}
                    height={120}
                    src={x.icon}
                  />
                  <div className="capitalize text-xs font-semibold">{x.name}</div>
                  <div className="flex mt-2 items-center">
                    <Icon className={clsx(styles.bluestar)} fafa="faStar" width={6} />
                    <Icon className={clsx(styles.bluestar)} fafa="faStar" width={6} />
                    <Icon className={clsx(styles.bluestar)} fafa="faStar" width={6} />
                    <Icon
                      className={clsx({ [styles.bluestar]: stars > 3 })}
                      fafa="faStar"
                      width={6}
                    />
                    <Icon
                      className={clsx({ [styles.bluestar]: stars > 4 })}
                      fafa="faStar"
                      width={6}
                    />
                    <div className="text-xss">5k</div>
                  </div>
                  <div className="text-xss mt-8">free</div>
                </div>
              );
            })}
        </div>
      </div>

      <div
        id="gamerib"
        className={clsx(
          styles.frontCont,
          styles.amzGames,
          'my-8 py-20 w-auto mx-8 \
        flex justify-between noscroll overflow-x-scroll overflow-y-hidden'
        )}
      >
        <div className="flex w-64 flex-col text-gray-100 h-full px-8">
          <div className="text-xl">{'store.featured-game'}</div>
          <div className="text-xs mt-2">{'store.featured-game.info'}</div>
        </div>
        <div className="flex w-max pr-8">
          {gamerib &&
            gamerib.map((x, i) => {
              const stars = 5;
              return (
                <div key={i} className={clsx(styles.ribcont, 'ribcont rounded my-auto p-2 pb-2')}>
                  <img
                    alt=""
                    className="mx-1 py-1 mb-2 rounded"
                    width={120}
                    height={120}
                    src={x.icon}
                  />
                  <div className="capitalize text-xs font-semibold">{x.name}</div>
                  <div className="flex mt-2 items-center">
                    <Icon className={clsx(styles.bluestar)} fafa="faStar" width={6} />
                    <Icon className={clsx(styles.bluestar)} fafa="faStar" width={6} />
                    <Icon className={clsx(styles.bluestar)} fafa="faStar" width={6} />
                    <Icon
                      className={clsx({ [styles.bluestar]: stars > 3 })}
                      fafa="faStar"
                      width={6}
                    />
                    <Icon
                      className={clsx({ [styles.bluestar]: stars > 4 })}
                      fafa="faStar"
                      width={6}
                    />
                    <div className="text-xss">5k</div>
                  </div>
                  <div className="text-xss mt-8">free</div>
                </div>
              );
            })}
        </div>
      </div>

      <div
        id="movrib"
        className={clsx(
          styles.frontCont,
          styles.amzMovies,
          'frontCont amzMovies my-8 py-20 w-auto mx-8 \
        flex justify-between noscroll overflow-x-scroll overflow-y-hidden'
        )}
      >
        <div className="flex w-64 flex-col text-gray-100 h-full px-8">
          <div className="text-xl">{'store.featured-film'}</div>
          <div className="text-xs mt-2">{'store.featured-film.info'}</div>
        </div>
        <div className="flex w-max pr-8">
          {movrib &&
            movrib.map((x, i) => {
              var stars = 3;
              return (
                <div key={i} className={clsx(styles.ribcont, ' rounded my-auto p-2 pb-2')}>
                  <img
                    alt=""
                    className="mx-1 py-1 mb-2 rounded"
                    width={120}
                    height={120}
                    src={x.icon}
                  />
                  <div className="capitalize text-xs font-semibold">{x.name}</div>
                  <div className="flex mt-2 items-center">
                    <Icon className={clsx(styles.bluestar)} fafa="faStar" width={6} />
                    <Icon className={clsx(styles.bluestar)} fafa="faStar" width={6} />
                    <Icon className={clsx(styles.bluestar)} fafa="faStar" width={6} />
                    <Icon
                      className={clsx({ [styles.bluestar]: stars > 3 })}
                      fafa="faStar"
                      width={6}
                    />
                    <Icon
                      className={clsx({ [styles.bluestar]: stars > 4 })}
                      fafa="faStar"
                      width={6}
                    />
                    <div className="text-xss">5k</div>
                  </div>
                  <div className="text-xss mt-8">owned</div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default FrontPage;
