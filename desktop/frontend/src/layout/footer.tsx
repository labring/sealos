import React from 'react';

export default function Footer() {
  return (
    <div className="flex items-center border pl-px">
      <StartMenu />
      <Dock />
      <StatusBar />
    </div>
  );
}

function Dock() {
  return <div>dock</div>;
}

function StartMenu() {
  return <div>start menu</div>;
}

function StatusBar() {
  return <div>status</div>;
}
