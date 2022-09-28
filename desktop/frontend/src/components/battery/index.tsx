// import { useDispatch, useSelector } from 'react-redux';
import './index.module.scss';

const Battery = ({ pct }: any) => {
  const btLevel = 0;

  return (
    <>
      <div className="uicon taskIcon">
        <span className="battery">
          <div className="btFull" style={{ width: `${Math.round(Math.abs(btLevel))}%` }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="20"
              width="20"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                fill="#000"
                d="M17 6a3 3 0 0 1 3 3v1h1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1v1a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h12Zm-.002 1.5H5a1.5 1.5 0 0 0-1.494 1.356L3.5 9v6a1.5 1.5 0 0 0 1.355 1.493L5 16.5h11.998a1.5 1.5 0 0 0 1.493-1.355l.007-.145V9a1.5 1.5 0 0 0-1.355-1.493l-.145-.007ZM6 9h10a1 1 0 0 1 .993.883L17 10v4a1 1 0 0 1-.883.993L16 15H6a1 1 0 0 1-.993-.883L5 14v-4a1 1 0 0 1 .883-.993L6 9h10H6Z"
              />
            </svg>
          </div>
        </span>
      </div>
      {pct ? <div className="text-xs">{Math.round(Math.abs(btLevel))}%</div> : null}
    </>
  );
};

export default Battery;
